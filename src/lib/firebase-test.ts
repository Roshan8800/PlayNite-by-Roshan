import {
  initializeApp,
  getApps,
  FirebaseApp
} from 'firebase/app';
import {
  getAuth,
  Auth,
  connectAuthEmulator,
  signInAnonymously
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import {
  getStorage,
  FirebaseStorage,
  connectStorageEmulator,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import {
  getAnalytics,
  Analytics
} from 'firebase/analytics';
import {
  getDatabase,
  Database,
  connectDatabaseEmulator,
  ref as dbRef,
  set,
  get,
  remove
} from 'firebase/database';
import {
  getMessaging,
  isSupported,
  Messaging
} from 'firebase/messaging';

interface FirebaseTestResult {
  service: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

interface FirebaseTestResults {
  app: FirebaseTestResult;
  auth: FirebaseTestResult;
  firestore: FirebaseTestResult;
  storage: FirebaseTestResult;
  analytics: FirebaseTestResult;
  realtimeDatabase: FirebaseTestResult;
  messaging: FirebaseTestResult;
  overall: 'success' | 'error' | 'warning';
}

class FirebaseTester {
  private app: FirebaseApp;
  private auth: Auth;
  private db: Firestore;
  private storage: FirebaseStorage;
  private analytics: Analytics | null = null;
  private rtdb: Database;
  private messaging: Messaging | null = null;
  private results: FirebaseTestResults;

  constructor() {
    // Firebase configuration
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD2uSEnnybi9SemRiEXbiEw0jgjeaeZcsI",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-5252987317-5adc1.firebaseapp.com",
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://studio-5252987317-5adc1-default-rtdb.firebaseio.com",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-5252987317-5adc1",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-5252987317-5adc1.firebasestorage.app",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "399312653683",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:399312653683:web:a19bfca21413d152bd4906",
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-CH6N4NBHCK"
    };

    // Initialize Firebase app
    this.app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    // Initialize services
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    this.storage = getStorage(this.app);
    this.rtdb = getDatabase(this.app);

    // Initialize client-side services
    if (typeof window !== 'undefined') {
      this.analytics = getAnalytics(this.app);

      // Initialize messaging if supported
      isSupported().then((supported) => {
        if (supported) {
          this.messaging = getMessaging(this.app);
        }
      });
    }

    // Initialize results
    this.results = {
      app: { service: 'Firebase App', status: 'success', message: 'App initialized successfully' },
      auth: { service: 'Authentication', status: 'success', message: 'Auth service initialized' },
      firestore: { service: 'Firestore', status: 'success', message: 'Firestore initialized' },
      storage: { service: 'Storage', status: 'success', message: 'Storage initialized' },
      analytics: { service: 'Analytics', status: 'success', message: 'Analytics initialized' },
      realtimeDatabase: { service: 'Realtime Database', status: 'success', message: 'RTDB initialized' },
      messaging: { service: 'Messaging', status: 'success', message: 'Messaging initialized' },
      overall: 'success'
    };
  }

  async testAppInitialization(): Promise<void> {
    try {
      if (!this.app) {
        throw new Error('Firebase app not initialized');
      }

      const apps = getApps();
      if (apps.length === 0) {
        throw new Error('No Firebase apps found');
      }

      this.results.app = {
        service: 'Firebase App',
        status: 'success',
        message: `App initialized successfully. App count: ${apps.length}`,
        details: {
          appId: this.app.options.appId,
          projectId: this.app.options.projectId
        }
      };
    } catch (error: any) {
      this.results.app = {
        service: 'Firebase App',
        status: 'error',
        message: `App initialization failed: ${error.message}`,
        details: error
      };
      this.updateOverallStatus();
    }
  }

  async testAuthentication(): Promise<void> {
    try {
      if (!this.auth) {
        throw new Error('Auth service not initialized');
      }

      // Test anonymous sign in (safe for testing)
      try {
        const userCredential = await signInAnonymously(this.auth);
        if (userCredential.user) {
          this.results.auth = {
            service: 'Authentication',
            status: 'success',
            message: 'Authentication working. User signed in anonymously.',
            details: {
              uid: userCredential.user.uid,
              isAnonymous: userCredential.user.isAnonymous
            }
          };
        } else {
          throw new Error('No user returned from sign in');
        }
      } catch (authError: any) {
        // If anonymous sign in fails, just verify the service exists
        if (this.auth) {
          this.results.auth = {
            service: 'Authentication',
            status: 'warning',
            message: `Auth service available but sign in test failed: ${authError.message}`,
            details: authError
          };
        } else {
          throw authError;
        }
      }
    } catch (error: any) {
      this.results.auth = {
        service: 'Authentication',
        status: 'error',
        message: `Authentication test failed: ${error.message}`,
        details: error
      };
      this.updateOverallStatus();
    }
  }

  async testFirestore(): Promise<void> {
    try {
      if (!this.db) {
        throw new Error('Firestore not initialized');
      }

      // Test Firestore by creating a test collection and document
      const testCollection = 'test-connection';
      const testDoc = {
        timestamp: new Date(),
        test: true,
        message: 'Firebase connection test'
      };

      // Add document
      const docRef = await addDoc(collection(this.db, testCollection), testDoc);

      // Read document back
      const querySnapshot = await getDocs(collection(this.db, testCollection));
      const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Clean up - delete the test document
      if (docRef) {
        await deleteDoc(doc(this.db, testCollection, docRef.id));
      }

      this.results.firestore = {
        service: 'Firestore',
        status: 'success',
        message: `Firestore connection successful. Test document created and deleted.`,
        details: {
          documentsFound: docs.length,
          testDocId: docRef?.id
        }
      };
    } catch (error: any) {
      this.results.firestore = {
        service: 'Firestore',
        status: 'error',
        message: `Firestore test failed: ${error.message}`,
        details: error
      };
      this.updateOverallStatus();
    }
  }

  async testStorage(): Promise<void> {
    try {
      if (!this.storage) {
        throw new Error('Storage not initialized');
      }

      // Test Storage by uploading a small test file
      const testFileName = `test-${Date.now()}.txt`;
      const testContent = 'Firebase Storage connection test';

      // Upload test file
      const fileRef = ref(this.storage, testFileName);
      await uploadString(fileRef, testContent, 'raw');

      // Get download URL
      const downloadURL = await getDownloadURL(fileRef);

      // Clean up - delete test file
      await deleteObject(fileRef);

      this.results.storage = {
        service: 'Storage',
        status: 'success',
        message: 'Firebase Storage connection successful. Test file uploaded and deleted.',
        details: {
          downloadURL: downloadURL,
          fileName: testFileName
        }
      };
    } catch (error: any) {
      this.results.storage = {
        service: 'Storage',
        status: 'error',
        message: `Storage test failed: ${error.message}`,
        details: error
      };
      this.updateOverallStatus();
    }
  }

  async testAnalytics(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        this.results.analytics = {
          service: 'Analytics',
          status: 'warning',
          message: 'Analytics test skipped (server-side environment)'
        };
        return;
      }

      if (!this.analytics) {
        throw new Error('Analytics not initialized');
      }

      // Analytics is harder to test directly, but we can verify it's initialized
      this.results.analytics = {
        service: 'Analytics',
        status: 'success',
        message: 'Firebase Analytics initialized successfully',
        details: {
          initialized: !!this.analytics
        }
      };
    } catch (error: any) {
      this.results.analytics = {
        service: 'Analytics',
        status: 'error',
        message: `Analytics test failed: ${error.message}`,
        details: error
      };
      this.updateOverallStatus();
    }
  }

  async testRealtimeDatabase(): Promise<void> {
    try {
      if (!this.rtdb) {
        throw new Error('Realtime Database not initialized');
      }

      // Test Realtime Database by setting and getting a test value
      const testPath = `test/connection-${Date.now()}`;
      const testData = {
        timestamp: new Date().toISOString(),
        test: true,
        message: 'RTDB connection test'
      };

      // Set test data
      await set(dbRef(this.rtdb, testPath), testData);

      // Read test data back
      const snapshot = await get(dbRef(this.rtdb, testPath));
      const data = snapshot.val();

      // Clean up - remove test data
      await remove(dbRef(this.rtdb, testPath));

      this.results.realtimeDatabase = {
        service: 'Realtime Database',
        status: 'success',
        message: 'Realtime Database connection successful. Test data written and deleted.',
        details: {
          testPath: testPath,
          dataRetrieved: data
        }
      };
    } catch (error: any) {
      this.results.realtimeDatabase = {
        service: 'Realtime Database',
        status: 'error',
        message: `Realtime Database test failed: ${error.message}`,
        details: error
      };
      this.updateOverallStatus();
    }
  }

  async testMessaging(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        this.results.messaging = {
          service: 'Messaging',
          status: 'warning',
          message: 'Messaging test skipped (server-side environment)'
        };
        return;
      }

      const supported = await isSupported();
      if (!supported) {
        this.results.messaging = {
          service: 'Messaging',
          status: 'warning',
          message: 'Firebase Messaging not supported in this environment'
        };
        return;
      }

      if (!this.messaging) {
        throw new Error('Messaging not initialized');
      }

      this.results.messaging = {
        service: 'Messaging',
        status: 'success',
        message: 'Firebase Messaging initialized and supported',
        details: {
          supported: supported,
          initialized: !!this.messaging
        }
      };
    } catch (error: any) {
      this.results.messaging = {
        service: 'Messaging',
        status: 'error',
        message: `Messaging test failed: ${error.message}`,
        details: error
      };
      this.updateOverallStatus();
    }
  }

  private updateOverallStatus(): void {
    const results = Object.values(this.results).filter(r => r.service !== 'overall');
    const hasError = results.some(r => r.status === 'error');
    const hasWarning = results.some(r => r.status === 'warning');

    if (hasError) {
      this.results.overall = 'error';
    } else if (hasWarning) {
      this.results.overall = 'warning';
    } else {
      this.results.overall = 'success';
    }
  }

  async runAllTests(): Promise<FirebaseTestResults> {
    console.log('🔥 Starting Firebase connection tests...\n');

    // Run all tests
    await this.testAppInitialization();
    await this.testAuthentication();
    await this.testFirestore();
    await this.testStorage();
    await this.testAnalytics();
    await this.testRealtimeDatabase();
    await this.testMessaging();

    this.updateOverallStatus();

    // Display results
    this.displayResults();

    return this.results;
  }

  private displayResults(): void {
    console.log('\n📊 Firebase Connection Test Results');
    console.log('=====================================\n');

    Object.entries(this.results).forEach(([key, result]) => {
      if (key === 'overall') return;

      const icon = result.status === 'success' ? '✅' :
                  result.status === 'warning' ? '⚠️' : '❌';

      console.log(`${icon} ${result.service}: ${result.message}`);

      if (result.details && typeof result.details === 'object') {
        console.log(`   Details:`, result.details);
      }
      console.log('');
    });

    const overallIcon = this.results.overall === 'success' ? '🎉' :
                       this.results.overall === 'warning' ? '⚠️' : '💥';

    console.log(`${overallIcon} Overall Status: ${this.results.overall.toUpperCase()}`);
  }

  getResults(): FirebaseTestResults {
    return this.results;
  }
}

// Export for use in other files
export { FirebaseTester };
export type { FirebaseTestResults, FirebaseTestResult };

// Auto-run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const tester = new FirebaseTester();
  tester.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}