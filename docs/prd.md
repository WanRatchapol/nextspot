# NextSpot Web MVP - Product Requirements Document (PRD)

## Goals and Background Context

### Goals
- **Primary Validation Goal**: Prove that Thai university students will use a simple tool to decide travel destinations faster
- **Speed Validation**: Measure actual decision time reduction from current 30+ minutes baseline
- **User Engagement**: Achieve 50+ weekly active users during 8-week validation period
- **Learning Metrics**: Collect preference data and usage patterns to validate full product hypothesis
- **Technical Proof**: Demonstrate web-first approach can serve student mobile usage patterns

### Background Context
Thai university students in Bangkok spend 30+ minutes deciding where to go for weekend trips, often defaulting to familiar places due to decision paralysis. Rather than building a complex mobile app, this web MVP tests our core hypothesis: *"Thai students will use a simple tool that helps them decide where to go faster, with options that fit their needs."*

This 8-week validation project runs Sept 23 - Nov 25, 2025, targeting Bangkok university students through a mobile-responsive web application focused purely on decision speed validation.

### Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-09-23 | 2.0 | Realistic 8-week web MVP scope | John (PM) |

## Requirements

### Functional Requirements

**FR1:** The system shall accept user preference inputs (budget range ฿500-3000, mood selection from 6 categories, time available) via enhanced visual web form

**FR2:** The system shall display up to 10 Bangkok destination cards in a Tinder-style swipeable interface with photos and mood categorization

**FR3:** The system shall capture swipe patterns, decision timing, and user satisfaction feedback for comprehensive validation metrics

**FR4:** The system shall maintain a "liked destinations" collection for users to review their swiped-right choices

**FR5:** The system shall provide smooth touch gestures and animations optimized for mobile web browsers

### Non-Functional Requirements

**NFR1:** Web application shall load and display card stack within 3 seconds on mobile browsers

**NFR2:** Swipe gestures shall be responsive with smooth animations at 60fps on mobile devices

**NFR3:** Application shall be mobile-responsive and usable on smartphones without app download

**NFR4:** System shall track comprehensive analytics including swipe patterns, timing data, and engagement metrics

**NFR5:** Card interface shall gracefully handle various screen sizes and orientations

## User Interface Design Goals

### Overall UX Vision
Modern, Tinder-inspired card interface optimized for mobile browsers. Focus on engaging swiping interactions and quick decision-making - students should get from "where should I go?" to liked destinations in under 5 minutes. Intuitive gestures, comprehensive engagement data.

### Core Screens
1. **Landing Page** - Brief explanation of swiping concept and "Start Swiping" CTA
2. **Enhanced Preference Input** - Visual mood category selection with 6 options, budget slider, time picker
3. **Tinder-Style Card Stack** - Swipeable destination cards with smooth animations and gesture controls
4. **Liked Destinations Collection** - Review and final selection from swiped-right destinations
5. **Feedback Capture** - Swipe analytics, timing data, and satisfaction rating

### Target Device: Mobile Web
Mobile-first responsive design for smartphones 5.5"-7". No native app - pure web experience accessible via browser.

## Technical Assumptions

### Technology Stack
- **Frontend**: Next.js with touch gesture libraries (react-spring, framer-motion) for smooth card animations
- **Backend**: Express.js API with analytics endpoints for swipe tracking
- **Database**: PostgreSQL or enhanced SQLite with mood categorization and user analytics tables
- **Hosting**: Vercel or Netlify with CDN for fast image loading and gesture responsiveness
- **Libraries**: React gesture libraries for Tinder-style interactions

### Architecture Type: Interactive Web Application
Single-page application with gesture-based interactions, analytics tracking, and sophisticated content management. Enhanced data structure for mood categorization and swipe pattern analysis.

## Epic List

**Epic 1: Core Validation Platform**
Build the essential web platform that captures preference inputs, displays curated recommendations, and measures decision timing to validate our core hypothesis.

## Epic 1: Core Validation Platform

**Epic Goal:** Create a functional web application that proves Thai students will use a simple tool for faster travel decisions, with comprehensive validation metrics to guide future development.

### Story 1.1: Landing Page & User Onboarding

As a **Thai university student**,
I want **to understand what this tool does and start using it immediately**,
so that **I can quickly get travel recommendations without complex sign-up processes**.

#### Acceptance Criteria
1. Clean landing page explaining the swiping concept in Thai and English
2. "Start Swiping" call-to-action button prominently displayed
3. Brief explanation of how swiping works (3 simple steps: preferences → swipe → collect likes)
4. Mobile-optimized design with fast loading and gesture preview
5. No registration required - anonymous usage for MVP
6. Basic analytics tracking for landing page engagement
7. Clear value proposition: "Find your perfect spot in under 5 minutes by swiping"

### Story 1.2: Preference Input Interface

As a **Thai university student**,
I want **to quickly specify my budget, mood, and available time**,
so that **I get relevant destination suggestions without lengthy forms**.

#### Acceptance Criteria
1. Simple web form with 3 input sections:
   - Budget range slider (฿500 - ฿3,000)
   - Mood selection with visual cards (Chill/Relax, Adventure, Foodie, Cultural, Social/Fun, Romantic)
   - Time available (half-day, full-day, weekend)
2. Visual selectors with Thai/English labels and recognizable icons
3. Form completion in under 30 seconds
4. "Start Swiping Cards" submit button
5. Input validation and error handling
6. Form state preservation if user navigates back
7. Mobile-friendly touch interactions
8. Mood categories designed specifically for Bangkok student preferences

### Story 1.3: Tinder-Style Card Recommendation Interface

As a **Thai university student**,
I want **to swipe through destination suggestions like Tinder**,
so that **I can quickly browse options and make decisions intuitively**.

#### Acceptance Criteria
1. Tinder-style card stack interface with destination cards
2. Swipe right (like) / swipe left (skip) / tap for details functionality
3. Each card shows: large photo, name, brief description, budget indicator, mood tags
4. Smooth swipe animations and visual feedback
5. "Like" stack collecting swiped-right destinations
6. "Show me more cards" functionality when stack is empty
7. Mobile-optimized touch gestures and responsiveness
8. Card reveals optimized for mobile screen sizes
9. Maximum 10 cards per session to prevent decision fatigue
10. Fallback tap buttons for users who prefer clicking over swiping

### Story 1.4: Validation Metrics Capture

As a **product team**,
I want **to capture decision timing, swipe patterns, and user satisfaction data**,
so that **I can validate whether the tool actually reduces decision time and improves engagement**.

#### Acceptance Criteria
1. Timer starts when user reaches preference input page
2. Track swipe patterns (likes vs skips, cards viewed, final selection)
3. "How long did this take?" feedback form after selecting liked destinations
4. Quick satisfaction rating (1-5 stars) and engagement score
5. Optional comment field for user feedback
6. Swipe analytics: average cards viewed, like rate, decision speed
7. Session tracking to measure multiple visits and user behavior
8. Analytics integration for usage patterns and A/B testing capability
9. Weekly usage reports and swipe behavior analysis

### Story 1.5: Enhanced Content Management

As a **content manager**,
I want **to easily add and update destination information with mood categorization**,
so that **card recommendations match student preferences accurately**.

#### Acceptance Criteria
1. Admin interface for adding/editing destinations with mood tagging
2. Enhanced data structure: name, description, photos, budget_range, mood_tags[], time_needed, instagram_worthiness_score
3. Mood tagging system: Chill/Relax, Adventure, Foodie, Cultural, Social/Fun, Romantic
4. Image upload and optimization for card display (vertical orientation preferred)
5. Content validation and card preview functionality
6. Ability to enable/disable destinations and adjust recommendation frequency
7. 30+ initial Bangkok destinations covering all mood and budget combinations
8. Content backup and version control
9. Analytics dashboard showing which destinations get most likes/skips

## Success Metrics

### Primary Validation Metrics
- **Decision Time**: Average time from preference input to destination selection
- **Engagement Rate**: Average cards viewed per session and like percentage
- **Completion Rate**: Percentage of users who complete the full swiping flow
- **Return Usage**: Users who return within 2 weeks
- **Satisfaction Rating**: Average star rating and feedback sentiment

### Target Validation Results
- 70% of users complete full swiping flow (preferences → cards → selection) in under 5 minutes
- Average 6-10 cards viewed per session with 20%+ like rate
- 50+ weekly active users by week 8
- 4+ star average satisfaction rating
- 30% return usage rate
- Average session time: 3-5 minutes (significant improvement from 30+ minute baseline)

## Technical Risks & Mitigation

### Key Risks
1. **Mobile Performance**: Web app performance on various devices, especially gesture responsiveness
2. **Content Quality**: Maintaining relevant, accurate destination information with mood categorization
3. **User Discovery**: Getting students to find and try the swiping tool
4. **Gesture Complexity**: Implementing smooth Tinder-style interactions within 8-week timeline

### Mitigation Strategies
1. Extensive mobile testing and gesture library evaluation early in development
2. Start with quality over quantity for destinations, focus on accurate mood tagging
3. University outreach and social media promotion emphasizing unique swiping experience
4. Use proven React gesture libraries rather than building custom solutions

## Next Steps

### Immediate Development Plan
1. **Week 1-2**: Landing page and enhanced preference input interface (with mood categories)
2. **Week 3-4**: Tinder-style card swiping interface and swipe gesture implementation
3. **Week 5-6**: Enhanced content management system and destination curation (30+ destinations)
4. **Week 7-8**: Validation metrics, swipe analytics, testing, and user outreach

### Success Criteria for MVP
- Functional Tinder-style card swiping web application accessible on mobile devices
- 30+ curated Bangkok destinations covering all mood categories
- Working swipe analytics and validation metrics capture
- 50+ students tested the tool with comprehensive engagement feedback collected

This enhanced MVP will validate both the core decision-speed hypothesis and user engagement through intuitive swiping interactions, providing clear data to guide future development decisions.