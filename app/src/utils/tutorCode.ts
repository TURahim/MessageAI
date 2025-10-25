import { doc, getDoc, setDoc, runTransaction, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, TutorCodeRegistry } from '@/types/index';

/**
 * Generate a tutor code in format TUT-XXXXX
 * Uses uppercase alphanumeric characters (excluding confusing ones: 0, O, I, 1)
 */
export function generateTutorCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude 0, O, I, 1
  let code = 'TUT-';
  
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

/**
 * Validate tutor code format (TUT-XXXXX)
 */
export function isValidTutorCode(code: string): boolean {
  const pattern = /^TUT-[A-Z0-9]{5}$/;
  return pattern.test(code.toUpperCase());
}

/**
 * Find tutor by code using the registry collection (O(1) lookup)
 * Falls back to querying users collection for backward compatibility
 * Returns tutor User object or null if not found
 */
export async function findTutorByCode(code: string): Promise<User | null> {
  if (!isValidTutorCode(code)) {
    return null;
  }
  
  try {
    const normalizedCode = code.toUpperCase();
    
    // Try O(1) lookup in registry first (new tutors)
    const registryRef = doc(db, 'tutorCodes', normalizedCode);
    const registryDoc = await getDoc(registryRef);
    
    if (registryDoc.exists()) {
      const registry = registryDoc.data() as TutorCodeRegistry;
      
      // Fetch tutor user document
      const userRef = doc(db, 'users', registry.tutorId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        console.log('✅ Found tutor via registry:', registry.tutorId.substring(0, 8));
        return { uid: userDoc.id, ...userDoc.data() } as User;
      } else {
        console.error('⚠️ Registry points to non-existent user:', registry.tutorId);
      }
    }
    
    // Fallback: Query users collection (for tutors created before registry)
    console.log('📋 Registry miss, falling back to users collection query');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('tutorCode', '==', normalizedCode));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      console.log('✅ Found tutor via fallback query:', userDoc.id.substring(0, 8));
      
      // Create registry entry for future lookups (migration)
      try {
        await setDoc(doc(db, 'tutorCodes', normalizedCode), {
          tutorId: userDoc.id,
          createdAt: Timestamp.now(),
        });
        console.log('✅ Migrated tutor code to registry');
      } catch (e) {
        console.warn('⚠️ Could not create registry entry:', e);
      }
      
      return { uid: userDoc.id, ...userDoc.data() } as User;
    }
    
    console.log('❌ Tutor code not found:', normalizedCode);
    return null;
  } catch (error) {
    console.error('Error finding tutor by code:', error);
    return null;
  }
}

/**
 * Atomically reserve a tutor code for a tutor
 * Uses Firestore transaction to guarantee uniqueness
 * 
 * @param code - The code to reserve
 * @param tutorId - The tutor's uid
 * @returns true if successfully reserved, false if already taken
 */
export async function reserveTutorCode(code: string, tutorId: string): Promise<boolean> {
  const normalizedCode = code.toUpperCase();
  
  try {
    const result = await runTransaction(db, async (transaction) => {
      const registryRef = doc(db, 'tutorCodes', normalizedCode);
      const registryDoc = await transaction.get(registryRef);
      
      // Check if code already exists
      if (registryDoc.exists()) {
        return false; // Code already taken
      }
      
      // Atomically create registry entry
      const registryData: TutorCodeRegistry = {
        tutorId,
        createdAt: Timestamp.now(),
      };
      
      transaction.set(registryRef, registryData);
      return true;
    });
    
    return result;
  } catch (error) {
    console.error('Error reserving tutor code:', error);
    return false;
  }
}

/**
 * Generate and atomically reserve a unique tutor code
 * Retries up to 10 times if collision occurs
 * 
 * @param tutorId - The tutor's uid
 * @returns The reserved code
 */
export async function generateUniqueTutorCode(tutorId: string): Promise<string> {
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateTutorCode();
    const reserved = await reserveTutorCode(code, tutorId);
    
    if (reserved) {
      console.log(`✅ Tutor code ${code} reserved for ${tutorId.substring(0, 8)}`);
      return code;
    }
    
    console.log(`⚠️ Tutor code ${code} collision, retrying... (${attempt + 1}/${maxAttempts})`);
  }
  
  throw new Error('Failed to generate unique tutor code after multiple attempts');
}

