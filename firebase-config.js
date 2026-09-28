/**
 * FIREBASE FIRESTORE CLOUD DATABASE INTEGRATION
 * Allows real-time message persistence on static hosts (GitHub Pages)
 * and dynamic hosts without needing a dedicated backend database server.
 *
 * HOW TO CONNECT YOUR FREE FIREBASE PROJECT:
 * 1. Go to https://console.firebase.google.com/
 * 2. Click "Add project" and follow the prompts (Free Spark Plan).
 * 3. In your project dashboard, click the Web icon (</>) to create a Web App.
 * 4. Copy the firebaseConfig object and paste it below.
 * 5. In Firebase Console, go to "Build" -> "Firestore Database" -> "Create database".
 * 6. Start in "Test mode" (allows read/write during development) or set rules:
 *    allow read, write: if true;
 */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if Firebase is properly configured with user credentials
const isConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "YOUR_API_KEY" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== "YOUR_PROJECT_ID"
);

let db = null;

if (typeof firebase !== 'undefined' && isConfigured) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    console.log('[PortfolioDB] Firebase Firestore initialized successfully.');
  } catch (err) {
    console.error('[PortfolioDB] Initialization error:', err);
  }
} else {
  if (typeof firebase !== 'undefined') {
    console.info('[PortfolioDB] Running with fallback database. To enable Cloud Firestore sync, enter your credentials in firebase-config.js');
  }
}

// Global Database Controller
window.PortfolioDB = {
  isReady: () => Boolean(db && isConfigured),

  // Save new contact inquiry to Firestore
  async saveMessage(payload) {
    if (!this.isReady()) {
      return null;
    }
    try {
      const docRef = await db.collection('messages').add({
        name: payload.name,
        email: payload.email,
        subject: payload.subject,
        message: payload.message,
        timestamp: payload.timestamp || new Date().toISOString(),
        isRead: false,
        isStarred: false,
        targetEmail: 'absmadd@gmail.com'
      });
      console.log('[PortfolioDB] Message saved with ID:', docRef.id);
      return { id: docRef.id, ...payload };
    } catch (err) {
      console.error('[PortfolioDB] Error saving message to Firestore:', err);
      throw err;
    }
  },

  // Fetch all inquiries from Firestore
  async getMessages() {
    if (!this.isReady()) {
      return null;
    }
    try {
      const snapshot = await db.collection('messages')
        .orderBy('timestamp', 'desc')
        .get();

      const messages = [];
      snapshot.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return messages;
    } catch (err) {
      // In case composite index isn't created yet, fallback to fetching without order
      try {
        const fallbackSnapshot = await db.collection('messages').get();
        const fallbackMessages = [];
        fallbackSnapshot.forEach(doc => {
          fallbackMessages.push({
            id: doc.id,
            ...doc.data()
          });
        });
        fallbackMessages.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        return fallbackMessages;
      } catch (innerErr) {
        console.error('[PortfolioDB] Error fetching messages:', innerErr);
        throw innerErr;
      }
    }
  },

  // Realtime subscription for live incoming messages on Admin portal
  subscribeToMessages(callback) {
    if (!this.isReady()) return null;
    try {
      return db.collection('messages')
        .onSnapshot(snapshot => {
          const messages = [];
          snapshot.forEach(doc => {
            messages.push({
              id: doc.id,
              ...doc.data()
            });
          });
          messages.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
          callback(messages);
        }, err => {
          console.warn('[PortfolioDB] Realtime listener error:', err);
        });
    } catch (err) {
      console.warn('[PortfolioDB] Could not set up realtime listener:', err);
      return null;
    }
  },

  // Update read/starred status of a message
  async updateMessageStatus(id, updates) {
    if (!this.isReady()) return null;
    try {
      await db.collection('messages').doc(id).update(updates);
      return true;
    } catch (err) {
      console.error('[PortfolioDB] Error updating status in Firestore:', err);
      throw err;
    }
  },

  // Delete message permanently
  async deleteMessage(id) {
    if (!this.isReady()) return null;
    try {
      await db.collection('messages').doc(id).delete();
      return true;
    } catch (err) {
      console.error('[PortfolioDB] Error deleting message from Firestore:', err);
      throw err;
    }
  }
};
