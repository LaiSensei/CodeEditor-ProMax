import { db } from '../config/firebase'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { User } from 'firebase/auth'

export interface UserData {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  createdAt: Date
  lastLogin: Date
  preferences?: {
    theme?: string
    editorSettings?: {
      fontSize?: number
      tabSize?: number
    }
  }
}

export const createUserDocument = async (user: User) => {
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    const userData: UserData = {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined,
      createdAt: new Date(),
      lastLogin: new Date(),
      preferences: {
        theme: 'light',
        editorSettings: {
          fontSize: 14,
          tabSize: 2
        }
      }
    }

    try {
      await setDoc(userRef, userData)
    } catch (error) {
      console.error('Error creating user document:', error)
    }
  } else {
    // Update last login
    await updateDoc(userRef, {
      lastLogin: new Date()
    })
  }
}

export const getUserData = async (uid: string): Promise<UserData | null> => {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)
  
  if (userSnap.exists()) {
    return userSnap.data() as UserData
  }
  return null
}

export const updateUserPreferences = async (uid: string, preferences: Partial<UserData['preferences']>) => {
  const userRef = doc(db, 'users', uid)
  try {
    await updateDoc(userRef, {
      preferences: {
        ...preferences
      }
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
  }
} 