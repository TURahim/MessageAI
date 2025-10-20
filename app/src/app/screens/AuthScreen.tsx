import React from "react";
import { View, Text, Button } from "react-native";
import { auth } from "../../lib/firebase";
import { signInAnonymously } from "firebase/auth";

export default function AuthScreen({ navigation }: any) {
  const handleLogin = async () => {
    await signInAnonymously(auth);
    navigation.replace("Chats");
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 22, marginBottom: 12 }}>MessageAI</Text>
      <Button title="Continue (Anonymous)" onPress={handleLogin} />
    </View>
  );
}

