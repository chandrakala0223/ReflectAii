# 🌿 Gemini Reflection & Journaling Application

A private, secure, user-authenticated journaling and reflection workspace built with **React**, **Express**, **Firebase Authentication**, **Cloud Firestore**, and **Gemini 3.6 Flash**.

---

## 📖 Architecture & Features

- **🔐 Authenticated User Isolation**: Powered by Firebase Authentication (Google Sign-In & Guest Mode). User entries are isolated strictly at `/users/{userId}/entries/{entryId}`.
- **⚡ Gemini Multi-Turn AI Engine**: Multi-turn contextual reflection, executive synthesis, creative brainstorming, and action item generation via `@google/genai`.
- **🛡️ Resilient Fallback Ladder**: Built with a 4-tier model fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`) with error recovery for high availability.
- **💾 Guaranteed Persistence & Payload Hygiene**: Deep undefined-stripping ensures zero-crash Firestore writes with optimistic local updates and real-time syncing.
- **📊 Reflection Tagging & Auto-Title**: Automatic extraction of mood sentiments, keyword tags, and concise titles directly with Gemini.

---

## 🛠️ Prerequisites & Environment Setup

1. **Google Cloud Project**: An active GCP project with billing enabled.
2. **Google Cloud SDK (`gcloud`)**: Installed and initialized (`gcloud init`).
3. **Firebase CLI**: Installed (`npm install -g firebase-tools`) and logged in (`firebase login`).
4. **Node.js**: v20 or higher.

### Enable Required GCP APIs

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  aiplatform.googleapis.com
```

---

## 🔒 Secret Management Setup

Store your `GEMINI_API_KEY` securely in Google Cloud Secret Manager instead of hardcoding credentials:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY_HERE" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
# Replace YOUR_PROJECT_NUMBER with your actual Google Cloud project number
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🛡️ Cloud Firestore Security Rules

Deploy the following security rules in `firestore.rules` to enforce strict owner-bound data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Isolated user scope: Users can only read and write their own documents & subcollections
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /entries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Explicitly deny any unauthorized or cross-user operations
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy the rules via Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

---

## 🚀 Cloud Run Deployment Flow

### Step 1: Build and Deploy to Cloud Run

Deploy directly from source using the `gcloud run deploy` command:

```bash
gcloud run deploy gemini-reflections-app \
  --source=. \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-env-vars=NODE_ENV=production
```

### Step 2: Apply Mandatory Campaign Verification Label

Apply the required resource label to register the service for automated challenge verification:

```bash
gcloud run services update gemini-reflections-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Comprehensive Walkthrough & Test Guide

### 1. Authentication Flow
- **Test Case 1.1 (Google Sign-In)**: Click "Sign in with Google" on the landing page. Complete the popup dialog. Verify immediate redirection to the private dashboard showing your name and avatar.
- **Test Case 1.2 (Guest Mode)**: Click "Explore as Guest" on the landing page. Verify an anonymous session is created with full access to reflection features.
- **Test Case 1.3 (Sign Out)**: Click the sign-out icon in the top header. Verify the session terminates and returns to the Landing View.

### 2. Multi-turn Reflection with Gemini
- **Test Case 2.1 (Prompt Submission)**: In the prompt composer, enter a reflection (e.g. "I am trying to balance work and creative hobbies"). Click "Reflect" or press `Cmd/Ctrl + Enter`.
- **Test Case 2.2 (Fallback Ladder Verification)**: Verify Gemini responds with thoughtful, compassionate inquiry and formats response in clean Markdown.
- **Test Case 2.3 (Multi-turn Context)**: Submit a follow-up response in the same entry (e.g. "Specifically, I feel guilty when taking breaks"). Verify Gemini retains the context of earlier turns.

### 3. Modes & Summarization
- **Test Case 3.1 (Synthesis Mode)**: Switch the mode pill to "Synthesize". Type "Summarize key themes". Verify structured bullet points with tone, insights, and next actions.
- **Test Case 3.2 (Brainstorm Mode)**: Switch mode to "Brainstorm". Verify creative possibilities and actionable ideas are returned.
- **Test Case 3.3 (Action Steps Mode)**: Switch mode to "Action Steps". Verify concrete, prioritized tasks are generated.

### 4. Firestore Persistence & Isolation
- **Test Case 4.1 (Persistence Verification)**: Refresh the browser tab. Verify all past entries, titles, messages, and tags reload instantly from Firestore.
- **Test Case 4.2 (Auto-Tag & Title)**: Click "Auto-Tag & Title" at the top of an entry. Verify Gemini automatically derives a meaningful title, tags, and summary.
- **Test Case 4.3 (Cross-User Isolation)**: Sign out and sign in with a different Google account or Guest session. Verify previous user's reflections are completely hidden and unreadable.

### 5. Management & Export
- **Test Case 5.1 (Search & Filter)**: In the sidebar, type a keyword in the search bar or click a filter pill ("Reflect", "Summary", "Ideas"). Verify instant filtering.
- **Test Case 5.2 (Markdown Export)**: Click the Download icon on any reflection entry. Verify a structured `.md` file is downloaded to your machine.
- **Test Case 5.3 (Delete Entry)**: Click the trash icon on an entry in the sidebar or active header, confirm in the modal. Verify it is deleted permanently from Firestore.

### 6. MoodSound — Personal Soundtrack Experience
- **Test Case 6.1 (Mood Analysis & Music Discovery)**: In any active journal reflection with messages, click "🎵 Create Soundtrack" in the header. Verify Gemini analyzes the emotional tone and suggests legitimate, matched tracks.
- **Test Case 6.2 (Legitimate Audio Preview)**: In the track recommendation list, click the Play button on any track. Verify the 30-second audio stream plays with an interactive progress bar, time indicator, and volume control.
- **Test Case 6.3 (Save Soundtrack to Moment)**: Click "Save as Moment Soundtrack". Verify the soundtrack is associated with the journal entry and saved to your personal library in Cloud Firestore.
- **Test Case 6.4 (Moment Soundtrack Banner)**: Return to the journal entry. Verify the "Associated Moment Soundtrack" banner displays the album art, track details, atmosphere reflection, and embedded audio player.
- **Test Case 6.5 (MoodSound Library View)**: Click the "🎵 MoodSound" navigation tab in the top header. Verify all saved soundtracks are browsable with mood filter chips, search filtering, and "View Reflection" links.
- **Test Case 6.6 (Soundtrack Removal)**: Click the trash icon on a moment soundtrack card. Verify the soundtrack is cleanly removed from both the entry and the user library in Firestore.

### 7. Memory Map — Geographic Life Moments
- **Test Case 7.1 (Attach Location to Moment)**: In any journal workspace, click "📍 Add Location" in the toolbar. Type a search query (e.g. "Kyoto", "Central Park", "Eiffel Tower") or click a quick suggestion. Click "Attach Location to Moment". Verify the location is saved to the entry in Firestore.
- **Test Case 7.2 (Memory Map View)**: Click the "📍 Memory Map" tab in the header. Verify the interactive Google Map renders pins for all mapped journal entries, with custom pins showing mood colors.
- **Test Case 7.3 (Interactive Moment Pin & InfoWindow)**: Click any map marker pin. Verify the map smoothly centers on the pin, displays an InfoWindow card with the entry title, location name, snippet, date, and "Open Reflection" action.
- **Test Case 7.4 (Quick Location Filter Chips)**: In the Memory Map sidebar, click any city/place filter pill. Verify the map zooms and filters to moments from that place.
- **Test Case 7.5 (Unmapped Moments Tray)**: In the Memory Map drawer or unmapped section, view reflections without coordinates and click "Attach Location" to quickly assign them directly from the map.
- **Test Case 7.6 (Unified Life Moment Card)**: Observe entries with both a location and a soundtrack. Verify the card cohesively displays the place, soundtrack player, and reflection dialogue together.


