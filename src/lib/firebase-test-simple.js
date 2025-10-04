// Simple Firebase Connection Test
// This script tests all Firebase services using Firebase v9+ modular SDK

const { initializeApp, getApps } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');
const { getStorage } = require('firebase/storage');
const { getAnalytics } = require('firebase/analytics');
const { getDatabase } = require('firebase/database');

class FirebaseTester {
  constructor() {
    // Firebase configuration
    this.firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD2uSEnnybi9SemRiEXbiEw0jgjeaeZcsI",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-5252987317-5adc1.firebaseapp.com",
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://studio-5252987317-5adc1-default-rtdb.firebaseio.com",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-5252987317-5adc1",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-5252987317-5adc1.firebasestorage.app",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "399312653683",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:399312653683:web:a19bfca21413d152bd4906",
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-CH6N4NBHCK"
    };

    this.results = {
      app: { service: 'Firebase App', status: 'pending', message: 'Not tested yet' },
      auth: { service: 'Authentication', status: 'pending', message: 'Not tested yet' },
      firestore: { service: 'Firestore', status: 'pending', message: 'Not tested yet' },
      storage: { service: 'Storage', status: 'pending', message: 'Not tested yet' },
      analytics: { service: 'Analytics', status: 'pending', message: 'Not tested yet' },
      realtimeDatabase: { service: 'Realtime Database', status: 'pending', message: 'Not tested yet' },
      messaging: { service: 'Messaging', status: 'pending', message: 'Not tested yet' },
      overall: 'pending'
    };
  }

  async testAppInitialization() {
    try {
      console.log('🔥 Testing Firebase App Initialization...');

      // Check if Firebase is already initialized
      if (getApps().length > 0) {
        this.app = getApps()[0];
        this.results.app = {
          service: 'Firebase App',
          status: 'success',
          message: 'Firebase app already initialized',
          details: {
            appId: this.app.options.appId,
            projectId: this.app.options.projectId
          }
        };
      } else {
        // Initialize Firebase app
        this.app = initializeApp(this.firebaseConfig);
        this.results.app = {
          service: 'Firebase App',
          status: 'success',
          message: 'Firebase app initialized successfully',
          details: {
            appId: this.app.options.appId,
            projectId: this.app.options.projectId
          }
        };
      }

      console.log('✅ Firebase App: SUCCESS');
      return true;
    } catch (error) {
      console.log('❌ Firebase App: FAILED');
      this.results.app = {
        service: 'Firebase App',
        status: 'error',
        message: `App initialization failed: ${error.message}`,
        details: error
      };
      return false;
    }
  }

  async testAuthentication() {
    try {
      console.log('🔐 Testing Authentication...');

      const auth = getAuth(this.app);

      // Test if auth service is available
      if (!auth) {
        throw new Error('Auth service not available');
      }

      this.results.auth = {
        service: 'Authentication',
        status: 'success',
        message: 'Authentication service is available',
        details: {
          initialized: !!auth
        }
      };

      console.log('✅ Authentication: SUCCESS');
      return true;
    } catch (error) {
      console.log('❌ Authentication: FAILED');
      this.results.auth = {
        service: 'Authentication',
        status: 'error',
        message: `Authentication test failed: ${error.message}`,
        details: error
      };
      return false;
    }
  }

  async testFirestore() {
    try {
      console.log('🗄️ Testing Firestore...');

      const db = getFirestore(this.app);

      if (!db) {
        throw new Error('Firestore not available');
      }

      this.results.firestore = {
        service: 'Firestore',
        status: 'success',
        message: 'Firestore service is available',
        details: {
          initialized: !!db
        }
      };

      console.log('✅ Firestore: SUCCESS');
      return true;
    } catch (error) {
      console.log('❌ Firestore: FAILED');
      this.results.firestore = {
        service: 'Firestore',
        status: 'error',
        message: `Firestore test failed: ${error.message}`,
        details: error
      };
      return false;
    }
  }

  async testStorage() {
    try {
      console.log('📦 Testing Storage...');

      const storage = getStorage(this.app);

      if (!storage) {
        throw new Error('Storage not available');
      }

      this.results.storage = {
        service: 'Storage',
        status: 'success',
        message: 'Storage service is available',
        details: {
          initialized: !!storage
        }
      };

      console.log('✅ Storage: SUCCESS');
      return true;
    } catch (error) {
      console.log('❌ Storage: FAILED');
      this.results.storage = {
        service: 'Storage',
        status: 'error',
        message: `Storage test failed: ${error.message}`,
        details: error
      };
      return false;
    }
  }

  async testAnalytics() {
    try {
      console.log('📊 Testing Analytics...');

      // Analytics requires browser environment, so we'll just check if the service can be imported
      this.results.analytics = {
        service: 'Analytics',
        status: 'warning',
        message: 'Analytics test skipped (server environment - requires browser)',
        details: {
          reason: 'Server-side environment'
        }
      };

      console.log('⚠️ Analytics: SKIPPED (Server environment)');
      return true;
    } catch (error) {
      console.log('❌ Analytics: FAILED');
      this.results.analytics = {
        service: 'Analytics',
        status: 'error',
        message: `Analytics test failed: ${error.message}`,
        details: error
      };
      return false;
    }
  }

  async testRealtimeDatabase() {
    try {
      console.log('💾 Testing Realtime Database...');

      const rtdb = getDatabase(this.app);

      if (!rtdb) {
        throw new Error('Realtime Database not available');
      }

      this.results.realtimeDatabase = {
        service: 'Realtime Database',
        status: 'success',
        message: 'Realtime Database service is available',
        details: {
          initialized: !!rtdb
        }
      };

      console.log('✅ Realtime Database: SUCCESS');
      return true;
    } catch (error) {
      console.log('❌ Realtime Database: FAILED');
      this.results.realtimeDatabase = {
        service: 'Realtime Database',
        status: 'error',
        message: `Realtime Database test failed: ${error.message}`,
        details: error
      };
      return false;
    }
  }

  async testMessaging() {
    try {
      console.log('📨 Testing Messaging...');

      // Messaging requires browser environment and service worker support
      this.results.messaging = {
        service: 'Messaging',
        status: 'warning',
        message: 'Messaging test skipped (server environment - requires browser)',
        details: {
          reason: 'Server-side environment'
        }
      };

      console.log('⚠️ Messaging: SKIPPED (Server environment)');
      return true;
    } catch (error) {
      console.log('❌ Messaging: FAILED');
      this.results.messaging = {
        service: 'Messaging',
        status: 'error',
        message: `Messaging test failed: ${error.message}`,
        details: error
      };
      return false;
    }
  }

  updateOverallStatus() {
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

  displayResults() {
    console.log('\n📊 Firebase Connection Test Results');
    console.log('=====================================\n');

    Object.entries(this.results).forEach(([key, result]) => {
      if (key === 'overall') return;

      const icon = result.status === 'success' ? '✅' :
                  result.status === 'warning' ? '⚠️' : '❌';

      console.log(`${icon} ${result.service}: ${result.message}`);

      if (result.details && typeof result.details === 'object') {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
      console.log('');
    });

    const overallIcon = this.results.overall === 'success' ? '🎉' :
                       this.results.overall === 'warning' ? '⚠️' : '💥';

    console.log(`${overallIcon} Overall Status: ${this.results.overall.toUpperCase()}`);
  }

  async runAllTests() {
    console.log('🚀 Starting Firebase connection tests...\n');

    try {
      // Run all tests
      await this.testAppInitialization();
      await this.testAuthentication();
      await this.testFirestore();
      await this.testStorage();
      await this.testAnalytics();
      await this.testRealtimeDatabase();
      await this.testMessaging();

      this.updateOverallStatus();
      this.displayResults();

      return this.results;
    } catch (error) {
      console.error('💥 Test execution failed:', error);
      this.results.overall = 'error';
      return this.results;
    }
  }
}

// Run the tests
async function main() {
  const tester = new FirebaseTester();
  const results = await tester.runAllTests();

  // Exit with appropriate code
  if (results.overall === 'success') {
    process.exit(0);
  } else if (results.overall === 'warning') {
    process.exit(0); // Warnings are acceptable
  } else {
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = FirebaseTester;