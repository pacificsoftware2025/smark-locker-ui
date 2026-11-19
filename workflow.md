# Smart Locker System - Project Workflow

> **DEVELOPMENT REFERENCE:**  
> This document defines the exact business workflow, UI screens, backend interactions, and hardware trigger sequences for the Smart Locker project.  
> Whenever implementing, modifying, or reviewing features, cross-reference this document alongside [GEMINI.md](file:///C:/Users/IT%20Software-2026/Desktop/locker%20ui/GEMINI.md).

---

## 1. Technology Stack Alignment

| Layer | Technology | Role / Responsibility |
| :--- | :--- | :--- |
| **Kiosk UI** | React Native (Bare Workflow / Android Kiosk Mode) | Touchscreen UI running in portrait mode on the tablet. Large touch targets, auto-reset timers. |
| **Hardware Integration** | Android Native Module (`LockerModule.java`) | Connects React Native to supplier's Java SDK (`SerialServer.getInstance().OpenBox(...)`) over `/dev/ttyS3` or `/dev/ttyS2`. |
| **Backend API** | Node.js / Express.js REST API | Manages machine status (`locker_id`), box allocation, PIN validation, order storage, and logging. |
| **Database** | PostgreSQL / MySQL | Persists customer details, laundry preferences, box occupancy, PINs, and transaction histories. |

---

## 2. High-Level System Workflow Diagram

```
[ HOME SCREEN ]
  │
  ├── 1. DROP OFF LAUNDRY
  │      └──► [ SCREEN 1: CONTACT DETAILS ]
  │              • Customer Full Name
  │              • +63 Philippine Mobile Number (10 digits)
  │              └──► [ SCREEN 2: LAUNDRY PREFERENCE ]
  │                      • Service Tier (Wash Only, Wash & Dry, Wash/Dry/Fold)
  │                      • Load Size (Small, Medium, Large)
  │                      • Water Temp (Cold, Warm)
  │                      • Softener (Yes, No)
  │                      • Special Instructions (Optional notes)
  │                      • Notice: Weighing & invoice at laundry shop
  │                      └──► [ SCREEN 3: DISPLAY BOX # & OPEN DOOR ]
  │                              • POST /api/dropoff to Express.js backend
  │                              • Hardware trigger: LockerModule.openBox(board, door)
  │                              • Display: "BOX #XX IS OPEN"
  │                              • 30s auto-reset countdown / Done button
  │
  └── 2. PICKUP LAUNDRY
         └──► [ SCREEN 1: ENTER CLAIM PIN / CODE ]
                 • Numeric touch keypad (6-digit PIN / SMS code)
                 • Verification via Express.js backend
                 └──► [ SCREEN 2: OPEN ASSIGNED BOX DOOR ]
                         • Hardware trigger: LockerModule.openBox(board, door)
                         • Display: "BOX #XX IS OPEN - Please retrieve laundry"
                         • Auto-reset back to Home Screen
```

---

## 3. Detailed Step-by-Step Execution

### Step 1: Home Screen (Main UI)
The idle screen welcoming customers.
* **Header / Branding:** Machine Tag indicator (e.g., `● CMH-01`).
* **Primary Touch Targets (Large Buttons):**
  1. **`DROP OFF LAUNDRY`** → Initiates the Drop Off Flow.
  2. **`PICKUP LAUNDRY`** → Initiates the Pickup Flow.
* **Behavior:**
  * Clean, high-contrast, uncluttered design suitable for industrial touchscreen displays.

---

### Step 2: Drop Off Flow

```
[Screen 1: Contact Details] ──► [Screen 2: Laundry Preferences] ──► [Screen 3: Open Door & Confirm]
```

#### Screen 1: Input Contact Details
Triggered when the user taps **`DROP OFF LAUNDRY`**.
* **Form Inputs:**
  * **Customer Name:** Standard text input field for customer's full name.
  * **Contact No. (+63):** Dedicated numeric input with fixed Philippine country code (`+63`) followed by 10 digits (e.g., `+63 917 123 4567`).
* **Validation Rules:**
  * Name cannot be empty.
  * Contact number must contain exactly 10 valid digits following `+63`.
* **Actions:**
  * **`Next` Button:** Validates input, saves in React component state, and advances to Screen 2.
  * **`Cancel` Button:** Discards entered data and returns immediately to the Home Screen.
* **Kiosk Behavior:**
  * 60-second inactivity timer that auto-returns to Home Screen if abandoned.

---

#### Screen 2: Select Laundry Preference
Displays service configuration and options before unlocking any physical locker box.

* **Header Information:**
  * **Machine Tag:** `● CMH-01`
  * **Assigned Box Preview:** `📦 Box #03 (Medium)` *(Pre-allocated or fetched from Express.js based on availability)*
  * **Cancel / Exit Button:** `✕` (Prompts confirmation or returns to Home Screen).
* **Title & Subtitle:**
  * **Title:** `Select Service & Drop Off`
  * **Subtitle:** `"Configure wash preferences before door unlocks."`
* **Option Selectors:**
  1. **Laundry Service Tier (Single Select):**
     * `Wash Only` — Machine wash only with standard spin — **₱40/kg**
     * `Wash & Dry` — Complete wash and hot air tumble dry — **₱55/kg**
     * `Wash, Dry & Fold` *(Default)* — Full service: wash, dry, neatly folded in bag — **₱65/kg**
  2. **Select Laundry Service Size (Single Select):**
     * `Small` (Max 5kg)
     * `Medium` (Max 7kg) *(Default)*
     * `Large` (Max 9kg)
  3. **Water Temperature (Single Select):**
     * `Cold` *(Default)*
     * `Warm`
  4. **Fabric Softener (Single Select):**
     * `Yes` *(Default)*
     * `No`
  5. **Special Instructions:**
     * Multi-line text field: *"Special instructions (e.g. delicate fabrics, separate whites, baby hypoallergenic detergent)..."*
* **Notice Banner:**
  * ⚖️ *"No payment due right now — Final invoice will be calculated and sent after verified scale weighing at the laundry shop."*
* **Action Button:**
  * **`🔒 Save Preference & Unlock Locker`**

---

#### Screen 3: Display Locker Number & Open Door
Triggered immediately when the user taps **`Save Preference & Unlock Locker`**.

1. **Save to Express.js Backend:**
   * React Native sends `POST /api/dropoff` with the payload:
     ```json
     {
       "machineId": "CMH-01",
       "customerName": "Juan Dela Cruz",
       "contactNumber": "+639171234567",
       "preferences": {
         "serviceTier": "Wash, Dry & Fold",
         "serviceSize": "Medium",
         "waterTemp": "Cold",
         "fabricSoftener": true,
         "specialInstructions": "Use gentle cycle for dark shirts"
       }
     }
     ```
   * Express.js backend saves the drop-off record in the database, sets the selected box status to `OCCUPIED`, and responds with confirmed box assignment (e.g., `boardId: 1, doorNumber: 3`).

2. **Trigger Hardware Unlock (Native Module / Supplier SDK):**
   * React Native invokes the Java bridge:
     ```javascript
     // Calls SerialServer.getInstance().OpenBox(boardId, doorNumber, 3000)
     const response = await LockerModule.openBox(1, 3);
     ```
   * *(In development/mock mode without hardware, simulates success and logs to console).*

3. **Screen Presentation & Confirmation:**
   * Prominently display: **`BOX #03 IS OPEN`**
   * Customer Instructions:
     * *"Please place your laundry inside Box #03."*
     * *"Push the door firmly to close."*
   * Auto-reset timer: **30-second countdown** that automatically resets back to the Home Screen.
   * **`Done` Button:** Allows customer to immediately finish and return to Home Screen without waiting for the timer.

---

### Step 3: Pickup Flow

```
[Home Screen: Tap Pickup] ──► [Screen 1: Enter Claim PIN] ──► [Screen 2: Open Box & Retrieve]
```

1. **Initiation:** Customer taps **`PICKUP LAUNDRY`** on the Home Screen.
2. **PIN Entry Screen:**
   * Touchscreen numeric keypad (0–9, Clear, Backspace).
   * Customer enters their claim **PIN / Claim Code** (e.g., 6-digit code received via SMS notification).
3. **Backend Verification:**
   * React Native sends `POST /api/pickup/verify` with `{ "machineId": "CMH-01", "claimCode": "..." }`.
   * Express.js validates the code against the database:
     * *If invalid or expired:* Returns error message ("Invalid claim code. Please check your SMS or contact support.").
     * *If valid:* Returns assigned box details (e.g., `boardId: 1, doorNumber: 3`).
4. **Hardware Unlock:**
   * React Native invokes `LockerModule.openBox(boardId, doorNumber)`.
5. **Success Screen:**
   * Displays: **`BOX #03 IS OPEN`**
   * Instructions: *"Please retrieve your clean laundry and push the door firmly to close."*
   * Express.js backend updates box status back to `AVAILABLE`.
6. **Return to Home:**
   * Automatically resets to the Home Screen after a 30-second countdown or upon tapping `Done`.

---

## 4. Error Handling & Edge Cases

| Scenario | Layer | System Behavior |
| :--- | :--- | :--- |
| **Backend API Unreachable** | Network | Display clear notification: *"Network error: Unable to connect to server. Please try again or contact staff."* Do not attempt hardware unlock. |
| **No Available Boxes for Size** | Backend / UI | Display prompt on Screen 2: *"Selected size currently unavailable. Please choose another size or check back later."* |
| **Hardware Serial Port Timeout** | Native Module | Differentiate from network errors. Display: *"Hardware alert: Locker failed to pop open. Please alert staff."* Record failed attempt to backend logs. |
| **User Abandons Screen** | Kiosk UI | Active countdown timers (60s on input screens, 30s on completion screens) automatically clear entered state and reset to Home Screen. |
| **Double Tap / Button Spamming** | Kiosk UI | Debounce action buttons: disable the button and show a loading spinner immediately upon the first tap until hardware/API finishes. |
