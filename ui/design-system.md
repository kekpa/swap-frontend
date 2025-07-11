# You are a senior front-end developer.

## Design Style

- A perfect balance between elegant minimalism and functional design witn inspiration from africa, latin america and caribbean like Haiti.
- Soft, refreshing colors that seamlessly integrate with the brand palette. ( #8b14fd, #2cd049 , #ffb746)
- Well-proportioned white space for a clean layout.
- Light and immersive user experience.
- Clear information hierarchy using subtle shadows and modular card layouts.
- Natural focus on core functionalities.
- Refined rounded corners.
- Delicate micro-interactions.
- Comfortable visual proportions.
- Accent colors chosen based on the app type.

Technical Specifications
- Each page should be 375x812 PX, with outlines to simulate a mobile device frame.
- Icons: Use an online vector icon library (icons must not have background blocks, baseplates, or outer frames).
- Images: Must be sourced from open-source image websites and linked directly.
- Styles: Use Tailwind CSS via CDN for styling.
- Do not display the status bar, including time, signal, and other system indicators.
- Do not display non-mobile elements, such as scrollbars.
- All text should be only black or white.


### What We're Building - project overview
We're developing a neobank application that uniquely combines banking functionality with messaging capabilities, chatbased or social media based neobank for the unbankek like if you could make payment in whatsapp easily. This is a fintech platform that integrates financial services with social interactions.


### Key Features
1. **Core Banking Functions**
   - Account management
   - Transaction processing
   - Currency exchange
   - P2P payment requests


2. **Messaging Platform**
   - Direct (1:1) and group messaging
   - Rich media support
   - Interaction management
   - Real-time updates


3. **Integrated Experience**
   - Transaction-to-interaction linking
   - Financial activity feeds within messaging
   - P2P payments within messaging context


5. **Wallet Features**
   - Multiple currency support
   - Currency conversion
   - Balance tracking

Heres the frontend structure so far, it's not rigid you can modify as long as you explain. 

frontend/swap/
├── _app/                            # Main application code
│   ├── _api/                        # API integration
│   │   ├── apiClient.ts             # API client with request/response handling
│   │   └── apiPaths.ts              # API endpoint paths
│   │
│   ├── components/                  # Shared UI components
│   │   ├── CurrencySelectionModal.tsx  # Currency selection component
│   │   ├── DatePickerModal.tsx      # Date picker component
│   │   ├── ProcessingModal.tsx      # Loading/processing indicator
│   │   ├── RecentsContacts.tsx      # Recent contacts component
│   │   └── Toast.tsx                # Toast notification component
│   │
│   ├── contexts/                    # React contexts for state management
│   │   ├── DataContext.tsx          # Global data state management
│   │   └── RefreshContext.tsx       # Refresh control context
│   │
│   ├── features/                    # Feature-based organization
│   │   ├── auth/                    # Authentication feature
│   │   │   ├── components/          # Auth-specific components
│   │   │   ├── context/             # Auth state management
│   │   │   ├── hooks/               # Auth custom hooks
│   │   │   ├── forgotPassword.tsx   # Password recovery screen
│   │   │   ├── launchScreen.tsx     # Initial launch screen
│   │   │   ├── logIn.tsx            # Login screen
│   │   │   ├── signUp.tsx           # Registration screen
│   │   │   └── walkthrough.tsx      # App introduction walkthrough
│   │   │
│   │   ├── Cards/                   # Card management features
│   │   │
│   │   ├── Community/               # Community features
│   │   │
│   │   ├── Deals/                   # Deals and promotions
│   │   │
│   │   ├── exchange/                # Currency exchange functionality
│   │   │
│   │   ├── Header/                  # Header components
│   │   │
│   │   ├── interactions/            # Messaging and social interactions
│   │   │   ├── components/          # Interaction-specific components
│   │   │   ├── context/             # Interaction state management
│   │   │   ├── ReferralsTransfers/  # Referral functionality
│   │   │   ├── SendMoney/           # Money transfer functionality
│   │   │   ├── AddBankRecipient.tsx # Add bank account recipient
│   │   │   ├── ContactInteractionHistory.tsx  # 1:1 interaction history
│   │   │   └── InteractionsHistory.tsx        # All interactions history
│   │   │
│   │   ├── profile/                 # User profile management
│   │   │
│   │   ├── Search/                  # Search functionality
│   │   │
│   │   ├── Spaces/                  # Groups/communities features
│   │   │
│   │   ├── wallet/                  # Financial features
│   │   │   ├── components/          # Wallet-specific components
│   │   │   ├── AddMoney/            # Add funds functionality
│   │   │   ├── add-money.tsx        # Add money screen
│   │   │   ├── HomeIntro.tsx        # Wallet introduction component
│   │   │   └── wallet.tsx           # Main wallet screen
│   │   │
│   │   └── Widgets/                 # Widget components
│   │
│   ├── navigation/                  # Navigation configuration
│   │   ├── interactions/            # Interactions-specific navigation
│   │   ├── appNavigator.tsx         # Main app navigation
│   │   ├── authNavigator.tsx        # Authentication flow
│   │   ├── cardNavigator.tsx        # Card screens navigation
│   │   ├── communityNavigator.tsx   # Community screens navigation
│   │   ├── dealsNavigator.tsx       # Deals screens navigation
│   │   ├── profileNavigator.tsx     # Profile screens navigation
│   │   ├── rootNavigator.tsx        # Root navigation container
│   │   ├── spacesNavigator.tsx      # Spaces screens navigation
│   │   └── walletNavigator.tsx      # Wallet screens navigation
│   │
│   ├── services/                    # Service layer
│   │   └── websocketService.ts      # Real-time communication service
│   │
│   ├── theme/                       # UI theming system
│   │   ├── index.ts                 # Theme exports
│   │   ├── theme.ts                 # Theme definition
│   │   ├── ThemeContext.tsx         # Theme context provider
│   │   ├── ThemeExample.tsx         # Theme showcase component
│   │   └── themeUtils.tsx           # Theme utility functions
│   │
│   ├── types/                       # TypeScript type definitions
│   │   ├── account.types.ts         # Account-related types
│   │   ├── api.types.ts             # API-related types
│   │   ├── auth.types.ts            # Authentication types
│   │   ├── currency.types.ts        # Currency-related types
│   │   ├── external-payment.types.ts # External payment types
│   │   ├── index.ts                 # Type exports
│   │   ├── interaction.types.ts     # Interaction/messaging types
│   │   ├── message.types.ts         # Message types
│   │   ├── payment-request.types.ts # Payment request types
│   │   ├── refresh.types.ts         # Pull-to-refresh types
│   │   ├── transaction.types.ts     # Transaction types
│   │   ├── ui.types.ts              # UI-related types
│   │   └── user.types.ts            # User profile types
│   │
│   ├── utils/                       # Utility functions
│   │
│   └── App.tsx                      # Main application component
│
├── assets/                          # Static assets (images, fonts, etc.)
│
├── config/                          # Configuration files
│
├── node_modules/                    # Dependencies
│
├── scripts/                         # Build and deployment scripts
│
├── .env.development                 # Development environment variables
├── .env.production                  # Production environment variables
├── app.config.js                    # Expo configuration
├── index.ts                         # Entry point
├── package.json                     # Dependencies and scripts
├── package-lock.json                # Dependency lock file
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # Project documentation


# TASK - what to do
- Simulate a Product Manager's detailed functional and information architecture design.
- Follow the design style and technical specifications to generate a complete UI design plan.
- Create a frontend/ui/design.html file that contains all pages displayed in a horizontal layout.
- Generate the first two pages now.