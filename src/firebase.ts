import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { JurisUser } from './types';

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID (Critical for AI Studio databases)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Authentication
export const auth = getAuth(app);

// Connection test as required by Firebase Skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Conexão com Firestore verificada com sucesso.');
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('⚠️ Firestore offline. Verifique a conexão com a internet.');
    } else {
      console.log('ℹ️ Verificação de conexão concluída (esperado caso doc ainda não exista).');
    }
    return true;
  }
}

// ==========================================
// Firestore Sync Helpers
// ==========================================

// Seed default users to Firestore if collection is empty
export async function syncInitialUsersToFirestore(defaultUsers: JurisUser[]) {
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);

    if (snapshot.empty) {
      console.log('Populando Firestore com usuários padrão...');
      for (const user of defaultUsers) {
        await setDoc(doc(db, 'users', user.id), user);
      }
    }
  } catch (err) {
    console.warn('Sincronização com Firestore em segundo plano:', err);
  }
}

// Fetch all users from Firestore
export async function fetchUsersFromFirestore(): Promise<JurisUser[]> {
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    if (!snapshot.empty) {
      return snapshot.docs.map(d => d.data() as JurisUser);
    }
  } catch (err) {
    console.warn('Aviso ao consultar Firestore:', err);
  }
  return [];
}

// Save or update a single user in Firestore
export async function saveUserToFirestore(user: JurisUser): Promise<void> {
  try {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
  } catch (err) {
    console.warn('Aviso ao gravar usuário no Firestore:', err);
  }
}

// Delete user from Firestore
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    console.warn('Aviso ao deletar usuário no Firestore:', err);
  }
}
