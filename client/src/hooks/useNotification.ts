import { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Chave gerada no Console do Firebase > Cloud Messaging > Web Push
const VAPID_KEY = "BADY88gXjEL6yBsfGhoED1sClkZwy94RAZ0xcbndU3hSkBtah_G1hZJcf9MIEHXD1e5BIhVrPeS5NEEpjDy7qEw"; 

export function useNotification(studentPeriod: string) {
  const [permission, setPermission] = useState(Notification.permission);

  const requestPermission = async () => {
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        // Obter o Token Único deste dispositivo
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        console.log("Token FCM:", token);

        if (token) {
          // Salvar token no Firestore para podermos enviar notificação depois
          // Salvamos junto com o período para filtrar o envio
          await setDoc(doc(db, "notification_tokens", token), {
            token: token,
            period: studentPeriod,
            updatedAt: serverTimestamp(),
            platform: navigator.userAgent
          });
        }
      }
    } catch (error) {
      console.error("Erro ao ativar notificações:", error);
    }
  };

  return { permission, requestPermission };
}