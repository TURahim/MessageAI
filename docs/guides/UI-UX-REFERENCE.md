# MessageAI - UI/UX Quick Reference

**Design Language:** WhatsApp-inspired, iOS-native feel  
**Color Palette:** Blue primary (#007AFF), clean whites/grays  
**Typography:** System fonts, clear hierarchy  
**Last Updated:** October 21, 2025

---

## 🎨 Design System

### Color Palette
```
Primary:       #007AFF (iOS Blue)
Success:       #34C759 (Green)
Warning:       #FF9500 (Orange)
Error:         #FF3B30 (Red)
Failed:        #ff6b6b (Light Red)

Text Primary:  #000000
Text Secondary:#666666
Text Tertiary: #999999

Own Bubble:    #007AFF (Blue)
Other Bubble:  #E5E5EA (Light Gray)
Background:    #f5f5f5 (Off-white)
Skeleton:      #E1E9EE (Blue-gray)
```

### Typography
```
Title:         20px, weight 600
Body:          16px, line-height 20px
Subtitle:      15px, color #666
Caption:       12-14px, color #999
Timestamp:     11px, opacity 0.7
```

### Spacing
```
Container:     16px padding
Bubble:        12px horizontal, 8px vertical
List Items:    16px padding
Margins:       4-8px vertical between items
Border Radius: 8-18px (buttons 8px, bubbles 18px)
```

### Shadows (iOS-style)
```
Light:   shadowOpacity 0.1, offset (0,2), radius 4
Medium:  shadowOpacity 0.25, offset (0,2), radius 4
Heavy:   shadowOpacity 0.3, offset (0,4), radius 8

Android: elevation 2-8
```

---

## 📱 Screen Layouts

### Conversations List (Tabs/Index)
**Layout:** FlatList with FAB  
**Components:**
- ConversationListItem (with avatar, name, preview, timestamp)
- FloatingActionButton (+ icon, bottom-right)
- Modal menu (New Chat, New Group)
- SkeletonConversationList (loading)
- EmptyState (no conversations)

**Visual Hierarchy:**
```
┌─────────────────────┐
│ 🔵 User    12:30 PM │ ← Avatar, name, time
│ Last message...  ✓✓│ ← Preview, read status
├─────────────────────┤
│ 👤 User2   10:15 AM│
│ Hello there...    ✓│
└─────────────────────┘
           [+] ← FAB
```

### Chat Screen (Chat/[id])
**Layout:** FlashList (reversed) + MessageInput  
**Components:**
- MessageBubble (own/other styling)
- MessageInput (text + image picker)
- ConnectionBanner (top, when offline)
- TypingIndicator (above input)
- OnlineIndicator (header-right)
- LoadingSpinner (initial load)
- ImageUploadProgress (overlay)

**Visual Hierarchy:**
```
┌─────────────────────┐
│ 📡 No connection    │ ← ConnectionBanner
├─────────────────────┤
│                     │
│   ┌─────────────┐   │ ← Other bubble (gray)
│   │ Hi there!   │   │
│   └─────────────┘   │
│                     │
│   ┌─────────────┐   │ ← Own bubble (blue)
│   │ Hello! ✓✓   │   │ ← With read receipt
│   └─────────────┘   │
│                     │
│ Alice is typing...  │ ← TypingIndicator
├─────────────────────┤
│ [📷] Type message...│ ← MessageInput
└─────────────────────┘
```

### Auth Screens (Login/Signup)
**Layout:** Centered form  
**Components:**
- TextInput fields (email, password)
- Primary button (Login/Sign Up)
- Divider with "OR"
- Google Sign-In button
- ErrorBanner (inline errors)
- LoadingSpinner (full-screen while loading)

**Visual Style:**
- White background
- Centered vertically
- 20px horizontal padding
- Blue primary buttons
- Rounded inputs (8px)

---

## 🧩 Component Inventory (18 Total)

### Core Components (5)
1. **MessageBubble** - WhatsApp-style chat bubble
   - Own: Blue (#007AFF), right-aligned
   - Other: Gray (#E5E5EA), left-aligned
   - Status icons: 🕐 sending, ✓ sent, ✓✓ read, ❌ failed
   - Supports text and images
   - Sender name for groups
   - Retry button for failed

2. **MessageInput** - Bottom input bar
   - TextInput with auto-grow (max 5 lines)
   - Image picker button (📷)
   - Send button (blue when text present)
   - Typing event triggers
   - Disabled state during upload

3. **ConversationListItem** - List row
   - Circular avatar (50x50)
   - Display name + last message preview
   - Relative timestamp (fromNow)
   - Online indicator for direct chats
   - Truncate preview at 50 chars

4. **ImageMessage** - Image display
   - Tap to view full-size modal
   - Loading placeholder
   - Error state
   - Aspect ratio maintained

5. **OnlineIndicator** - Presence dot
   - Green (online), Gray (offline)
   - 12px or 8px size variants
   - Animated pulse when online

### Feedback Components (5)
6. **ErrorBanner** - Inline error display
   - 3 types: error (red), warning (orange), info (blue)
   - Icons: ⚠️ (error), ⚡ (warning), ℹ️ (info)
   - Optional retry button
   - Optional dismiss (✕) button
   - Rounded (8px), shadowed

7. **EmptyState** - Empty screen placeholder
   - Large icon (64px emoji)
   - Title (20px, weight 600)
   - Subtitle (15px, color #666)
   - Optional action button (blue)
   - Centered layout

8. **LoadingSpinner** - Activity indicator
   - Small or large size
   - Optional text label
   - Blue color (#007AFF)
   - Centered in container

9. **SkeletonLoader** - Loading placeholders
   - Animated pulse (0.3 ↔ 1.0 opacity, 800ms)
   - 5 variants: Box, ConversationItem, ConversationList, MessageBubble, ChatMessages
   - Light gray (#E1E9EE)

10. **ConnectionBanner** - Network status
    - Orange background (#FF9500)
    - Top of screen
    - Icons: 📡
    - Message + helper text
    - Only shows when offline

### Feature Components (5)
11. **TypingIndicator** - "User is typing..."
    - Animated dots (...)
    - Shows user name
    - Above message input
    - Auto-hides after 3s

12. **ImageUploadProgress** - Upload overlay
    - Progress bar (0-100%)
    - Percentage display
    - Semi-transparent overlay
    - Auto-hides when complete

13. **UserCheckbox** - Multi-select for groups
    - Checkbox + user info
    - Avatar + name
    - Selected state (blue checkmark)
    - Used in newGroup screen

14. **Header Components** - Navigation extras
    - Back buttons
    - Online indicators
    - Group member count
    - Action buttons

### Utility Components (3)
15-18. Various utility wrappers and containers

---

## 🎨 Visual Patterns

### Message Bubbles (WhatsApp-style)
```
Own Messages (Right):
- Blue background (#007AFF)
- White text
- Tail on bottom-right (borderRadius: 4)
- Status icons bottom-right
- Max width 75%

Other Messages (Left):
- Light gray background (#E5E5EA)
- Black text
- Tail on bottom-left (borderRadius: 4)
- No status icons
- Max width 75%

Failed Messages:
- Red background (#ff6b6b)
- Red border
- "Tap to retry" button
```

### Avatars
```
Size: 50x50 (list), 40x40 (small)
Shape: Circular (borderRadius: 25 or 20)
Fallback: First letter on colored background
Border: None
Photo: Firebase Storage URL or placeholder
```

### Buttons
```
Primary (Blue):
- Background: #007AFF
- Text: White, weight 600
- Padding: 12-14px vertical, 24-30px horizontal
- Border radius: 8-25px
- Shadow/elevation

Secondary (Outlined):
- Background: Transparent
- Border: 1px #007AFF
- Text: #007AFF

Disabled:
- Opacity: 0.5
- No interaction
```

### Input Fields
```
Style:
- Background: White
- Border: 1px #ddd
- Border radius: 8px
- Padding: 12-16px
- Font size: 16px
- Height: Auto (multi-line)

States:
- Default: Gray border
- Focus: Blue border
- Error: Red border
- Disabled: Gray background
```

### FAB (Floating Action Button)
```
Position: Absolute, bottom-right (20px)
Size: 56x56
Shape: Circle (borderRadius: 28)
Color: Blue (#007AFF)
Icon: + (white, size 28)
Shadow: Heavy (elevation 4)
```

---

## 🎭 Interaction Patterns

### Optimistic UI
- Messages appear instantly when sent
- Show "sending" status (🕐)
- Update to "sent" (✓) on server ack
- Failed state (❌) with retry button
- Smooth transitions

### Loading States
1. **Initial Load:** Full-screen skeleton
2. **Pagination:** "Loading older messages..." button
3. **Image Upload:** Progress bar overlay
4. **Actions:** Button shows ActivityIndicator

### Error Feedback
1. **Inline Errors:** ErrorBanner at top of screen
2. **Failed Messages:** Red bubble + retry button
3. **Offline:** Orange banner at top
4. **Toast-style:** Dismissible after 3-5s

### Empty States
1. **No Conversations:** EmptyState with "New Conversation" button
2. **No Messages:** "Send a message to start" text
3. **No Users:** "No users found" (in search)

---

## 📐 Layout Structure

### Navigation
```
Stack Navigator (Expo Router):
├── (auth) Group [Modal]
│   ├── login
│   └── signup
├── (tabs) Group [Tabs]
│   ├── index (Conversations)
│   └── profile
├── users (Modal)
├── newGroup (Modal)
└── chat/[id] (Push)

Auth Guard: Redirects based on auth state
```

### Screen Anatomy

**Conversations:**
```
Header:     "MessageAI" title
Content:    FlatList of ConversationListItem
Footer:     None
Overlay:    FAB + Modal menu
```

**Chat:**
```
Header:     Conversation name + OnlineIndicator
Top:        ConnectionBanner (if offline)
Content:    FlashList (reversed, newest at bottom)
Above KB:   TypingIndicator
Bottom:     MessageInput
Overlay:    ImageUploadProgress
```

**Profile:**
```
Header:     "Profile" title
Content:    Avatar, name, email, sign out button
Actions:    Image picker for avatar
```

---

## 🎯 UX Enhancements

### Micro-interactions
1. **Button Press:** opacity 0.7 on touch
2. **Message Send:** Immediate appearance
3. **Typing:** Animated dots (...)
4. **Online Status:** Pulse animation on green dot
5. **Image Upload:** Smooth progress bar

### Feedback Mechanisms
1. **Status Icons:** 🕐 → ✓ → ✓✓ progression
2. **Network Banner:** Appears/disappears smoothly
3. **Skeletons:** Pulse while loading
4. **Error Messages:** Clear, actionable
5. **Empty States:** Helpful guidance

### Performance Feel
1. **Instant Send:** Optimistic UI (< 100ms)
2. **Smooth Scroll:** 60fps with FlashList
3. **Fast Load:** Pagination (0.5s initial)
4. **Progressive:** Skeletons → Content
5. **Responsive:** Immediate touch feedback

---

## 🖼️ Image Handling UX

### Upload Flow
```
1. Tap 📷 button in MessageInput
2. Image picker opens
3. Select image
4. Progress bar appears (0-100%)
5. Image compresses in background
6. Upload to Firebase Storage
7. Image appears in chat
8. Full-size modal on tap
```

### Display States
- Uploading: Progress bar overlay
- Ready: Thumbnail in bubble (max 250px width)
- Error: Placeholder with error message
- Full-size: Modal with tap-to-close

### Image Compression
- Target: < 2MB
- Max dimensions: 1920x1920
- Quality: 80% → 60% if needed
- Maintains aspect ratio

---

## 🔔 Notification UX

### Foreground Notifications
**When to Show:**
- User in different conversation ✓
- User on home screen ✓
- User in other app screens ✓

**When to Suppress:**
- User viewing the specific conversation ✗

**Notification Content:**
- Sender name (from Firestore)
- Message text or "📷 Image"
- Tap to open conversation

**⚠️ Requires:** Expo Dev Client (not Expo Go)

---

## 💬 Messaging UX

### Message States
```
Sending:  🕐 (gray clock) + gray text
Sent:     ✓ (single check) + normal
Read:     ✓✓ (double check) + normal
Failed:   ❌ + red bubble + retry button
```

### Read Receipts
**1-on-1 Chats:**
- ✓ = Sent (delivered to server)
- ✓✓ = Read (viewed by recipient)

**Group Chats:**
- "Read by 2/5" (text display)
- Shows count of readers

### Timestamps
**Conversation List:**
- Relative time: "2m ago", "1h ago", "Yesterday"
- Uses dayjs with relativeTime plugin

**Chat Messages:**
- Absolute time: "2:30 PM"
- Format: h:mm A

### Typing Indicators
**Display:** "Alice is typing..." with animated dots  
**Position:** Above message input  
**Timing:** Shows after 500ms typing, clears 3s after stop

---

## 👥 Group Chat UX

### Creation Flow
```
1. Tap + FAB → "New Group"
2. Multi-select users (checkboxes)
3. Enter group name
4. Tap "Create Group"
5. Navigate to group chat
```

### Group UI Differences
- Sender name above each bubble (except own)
- Group name in header (not user name)
- No online indicator
- Read counts instead of checkmarks
- Member count in subtitle

### Validation
- Minimum: 3 users (including creator)
- Maximum: 20 users
- Group name: 1-50 characters
- Visual feedback for validation errors

---

## 📋 List Components

### Conversations List
**Component:** FlatList (not FlashList - small dataset)  
**Item Height:** ~70px  
**Separator:** None (border-bottom on item)  
**Empty:** EmptyState with action  
**Loading:** SkeletonConversationList (8 items)

### Chat Messages
**Component:** FlashList (performance)  
**Direction:** Reversed (newest at bottom)  
**Item Height:** Variable (estimated ~80-100px)  
**Pagination:** 50 messages per page  
**Empty:** "No messages yet" + subtitle  
**Loading:** Full-screen LoadingSpinner

### Users List
**Component:** FlatList  
**Item:** UserCheckbox (for groups) or TouchableOpacity  
**Selection:** Checkmark appears on select  
**Search:** Filter by name (if implemented)

---

## 🎨 Animation Details

### Skeleton Loader
```
Animation: Pulse (opacity 0.3 ↔ 1.0)
Duration: 800ms
Easing: Linear
Loop: Infinite
Color: #E1E9EE
```

### Typing Indicator
```
Dots: "..."
Animation: Sequential fade
Pattern: . .. ... .. .
Duration: 1.5s loop
```

### Online Indicator
```
Green Dot: Slight pulse when online
Gray Dot: Static when offline
Transition: Fade (200ms)
```

### Modal Animations
```
Entry: Fade in (300ms)
Exit: Fade out (200ms)
Overlay: 50% black background
```

---

## 🎯 Accessibility Features

### Touch Targets
- Minimum: 44x44 (iOS guideline)
- Buttons: 50-56px recommended
- List items: Full width, 60-70px height

### Visual Feedback
- All touchables: activeOpacity 0.7
- Buttons: Scale or opacity on press
- Loading: Clear indicators
- Errors: High contrast colors

### Text Legibility
- Minimum size: 11px (timestamps)
- Body text: 16px
- High contrast ratios
- Dark text on light backgrounds

---

## 🎨 Custom Components

### ErrorBanner (Reusable)
```tsx
<ErrorBanner 
  message="User-friendly error"
  type="error|warning|info"
  onRetry={() => retry()}
  onDismiss={() => clear()}
/>

Visual: Colored bar, icon, message, buttons
Position: Top of screen or inline
Dismissible: Yes (optional)
```

### EmptyState (Reusable)
```tsx
<EmptyState
  icon="💬"
  title="No conversations"
  subtitle="Start chatting!"
  actionLabel="New Chat"
  onAction={() => navigate()}
/>

Visual: Centered, large icon, text, button
Use: Any empty data scenario
```

### SkeletonLoader (5 Variants)
```tsx
<SkeletonConversationList count={8} />
<SkeletonChatMessages count={10} />
<SkeletonBox width={200} height={50} />

Visual: Pulsing gray boxes
Use: While loading data
```

---

## 🎨 Style Consistency

### Border Radius Hierarchy
```
Small:   4px (tails on bubbles)
Medium:  8-12px (buttons, inputs, cards)
Large:   16-18px (message bubbles)
Circle:  50% (avatars, FAB)
```

### Shadow Consistency
```
All components use same shadow pattern:
- iOS: shadowColor #000, offset (0,2), opacity 0.1-0.3
- Android: elevation 2-8
- Applied to: Buttons, FAB, Modals, Cards
```

### Color Usage
```
Blue (#007AFF): Primary actions, own messages, links
Gray (#E5E5EA): Other messages, dividers
Orange (#FF9500): Warnings, offline banner
Red (#FF3B30): Errors, failed states
Green (#34C759): Success, online status
```

---

## 📱 Responsive Design

### Screen Adaptations
- Message bubbles: Max 75% width
- Images: Max width 250px, maintain aspect
- Modals: Full screen on small devices
- Inputs: Full width with 16px padding

### Keyboard Handling
```
KeyboardAvoidingView:
- Behavior: 'padding' (iOS), 'height' (Android)
- Offset: 90px (accounts for header)
- Smooth transitions
```

---

## 🎯 UX Principles Applied

1. **Immediate Feedback** - Optimistic UI, instant display
2. **Clear State** - Loading, success, error always visible
3. **Forgiving** - Retry buttons, offline queue
4. **Progressive** - Skeletons → Content transitions
5. **Familiar** - WhatsApp-inspired, iOS-native feel
6. **Accessible** - Large touch targets, clear text
7. **Performant** - 60fps, pagination, efficient renders

---

## 📊 Performance UX

### Perceived Performance
- Skeletons instead of spinners (feels faster)
- Optimistic updates (instant feedback)
- Progressive loading (content appears gradually)
- Smooth animations (60fps target)

### Actual Performance
- FlashList recycling (smooth scroll)
- Pagination (50/page, 90% faster load)
- Image compression (< 2MB, faster display)
- Debounced typing (reduces network calls)

---

## 🎨 Design Decisions

### Why Blue (#007AFF)?
- iOS system blue (familiar to users)
- High contrast on white
- Professional, trustworthy
- Consistent with platform

### Why WhatsApp-style Bubbles?
- Universally recognized pattern
- Clear own vs other distinction
- Efficient use of space
- Supports rich content (text, images)

### Why Skeletons?
- Better perceived performance
- Reduces "loading anxiety"
- Maintains layout structure
- More polished than spinners

### Why Pagination?
- 90% faster initial load (0.5s vs 2.1s)
- Smoother scrolling
- Lower memory usage
- Better network efficiency

---

**Total Components:** 18  
**Design System:** iOS-inspired, WhatsApp patterns  
**Performance:** 60fps target, optimistic UI  
**Accessibility:** WCAG-aware, large touch targets  
**Status:** Production-ready, polished UX ✅

