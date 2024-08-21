<template>
  <v-container>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card class="pa-5">
          <v-card-title class="text-center">Sign In</v-card-title>
          <v-card-text>
            <!-- Google Sign-In Button -->
            <div id="google-signin-button"></div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      isAuthenticated: false, // Track if the user is authenticated
    };
  },
  mounted() {
    // Check if the user is already authenticated
    const storedAuthStatus = localStorage.getItem('isAuthenticated');
    if (storedAuthStatus === 'true') {
      this.isAuthenticated = true;
      this.$emit('authenticated');
    } else {
      this.initializeGoogleSignIn();
    }
  },
  methods: {
    initializeGoogleSignIn() {
      // Initialize Google Sign-In
      google.accounts.id.initialize({
        client_id: import.meta.env.VUE_APP_GOOGLE_CLIENT_ID, // Replace with your Google Client ID
        callback: this.handleCredentialResponse,
      });
      // Render the Google Sign-In button
      google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large' } // Customize button appearance
      );
    },
    async handleCredentialResponse(response) {
      const token = response.credential;

      try {
        // Send the token to the backend to verify and authenticate
        const result = await fetch('/api/save-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await result.json();
        if (data.success) {
          // If authentication is successful, update the UI and store the status
          this.isAuthenticated = true;
          localStorage.setItem('isAuthenticated', 'true');
          this.$emit('authenticated'); // Notify parent component of successful authentication
        } else {
          console.error('Authentication failed:', data.error);
        }
      } catch (error) {
        console.error('Error during authentication:', error);
      }
    },
  },
};
</script>

<style scoped>
.auth-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
</style>