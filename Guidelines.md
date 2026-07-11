# Aditya University Athletics Club Website Guidelines

We are building an Athletics Club website using React and Vite.

## Project Goal

The Athletics Club website will serve as the official public-facing platform for the Aditya University Athletics Club.

The website should:

- Showcase the club to potential members.
- Promote athletics and healthy living.
- Display club activities and achievements.
- Redirect interested students to Orgtree for membership registration.
- Provide contact information for inquiries.
- Showcase the club's leadership and coaching staff.

## Target Users

- Current Aditya University students.
- Students interested in joining athletics.
- Parents.
- Visitors.
- Alumni.
- University staff.

## Functional Requirements

The system shall:

- Display club information.
- Display leadership information.
- Display gallery images.
- Filter gallery images.
- Redirect users to Orgtree.
- Display social media links.
- Allow visitors to contact the club.
- Display athletics activities.

## External Services

### Cloudinary

Purpose: Store and manage gallery images and home page background images.

### Orgtree

Purpose: Handle membership management.

### Google Maps

Purpose: Display the club location. This may be provided through Orgtree.

### WhatsApp

Purpose: Provide quick communication.

## Non-Functional Requirements

- Responsive on desktop, tablet, and mobile.
- Load within 3 seconds on a normal connection.
- Accessibility friendly.
- SEO optimized.
- Optimized images.
- Cross-browser compatible.
- Secure external redirects.

## Data Model

Orgtree provides membership management, so the website does not need its own backend for members.

### Leader

- Name
- Position
- Image
- Biography

### Gallery Image

- Image
- Caption
- Category

### Activity

- Title
- Description
- Image

## Animations

- Loading animation
- Hero image fade
- Card fade-in
- Navbar slide
- Gallery zoom
- Button hover
- Page transition
- Counter animation

## Typography

### Primary Font

Poppins

### Secondary Font

Montserrat

### Heading Style

Bold

### Body Style

Regular

## Buttons

### Primary Button

- Gold background
- White text
- Rounded corners

### Secondary Button

- Blue border
- Transparent background

### Danger Button

- Red background or red border

## Error Pages

### 404 Page

- Display a "Page not found" message.
- Include a "Return Home" button.

## SEO

### Title

Aditya University Athletics Club

### Description

Official Athletics Club website for Aditya University.

### Keywords

- Athletics
- Running
- Sports
- Aditya University

## Social Media

The website should include links to:

- Instagram
- Facebook
- LinkedIn
- YouTube
- Twitter/X
- Email
- WhatsApp

## Accessibility

- Every image must have alt text.
- Keyboard navigation must be supported.
- Text and background colors must have readable contrast.
- Font sizes must be responsive and readable.

## Deployment

### Frontend

React + Vite

### Hosting

Vercel

### Image Hosting

Cloudinary

### Membership

Orgtree

## Future Improvements

- Live events
- Competition calendar
- Online registration
- Coach dashboard
- Athlete profiles
- Performance tracking
- Newsletter

## Development Rules

- Use React functional components only.
- Use React hooks.
- Do not use class components.
- Use React Router.
- Use one component per file.
- Build reusable components.
- Avoid duplicated code.
- Use mobile-first design.
- Use CSS Modules or Tailwind CSS.
- Keep components under 200 lines where possible.
- Use descriptive variable names.
- Add comments only where logic is not obvious.

## What the Club Website Should Do

- Present the club's social media platforms clearly.
- Provide a blog or gallery that shows club activities, from training to competitions.
- Give visitors a preview of what the club does so they may feel encouraged to join.
- Act as a bridge of communication through the contact form for interested visitors.

# Website Pages

## Landing Page

## Initial Loading Animation - SVG Runner

When a visitor opens the website for the first time during a browser session, a full-screen loading animation should be displayed while the critical resources required for the landing page are being prepared.

The animation should match the athletics identity of the website and should not unnecessarily delay access to the website.

### Animation Concept

- Display a full-screen loading screen when the application initially starts.
- An animated SVG runner should move horizontally from the left side of the screen toward the right side.
- The runner should visually resemble an athlete running rather than using an emoji or static image.
- The SVG should remain lightweight and scalable across mobile, tablet and desktop screens.
- The runner should leave a glowing light or lightning-style trail behind while moving.
- The trail should visually complement the website's blue, gold and red color system.
- The animation should feel energetic, fast and related to athletics.

### Loading Flow

The intended flow is:

Visitor Opens Website

↓

Application Starts Loading

↓

Full-Screen Loading Screen Appears

↓

SVG Runner Starts Running from Left to Right

↓

A Glowing / Lightning Trail Appears Behind the Runner

↓

Critical Landing Page Resources Finish Loading

↓

Runner Completes the Animation

↓

Loading Screen Smoothly Fades Away

↓

Landing Page is Revealed

### Loading Logic

The loading animation should be connected to the actual loading state of the application rather than being used only as an artificial delay.

The application should wait for critical resources such as:

- The React application initialization.
- Required fonts.
- The first hero background image.

The application should **not** wait for every image on the website before displaying the landing page.

Resources such as:

- Remaining hero slideshow images.
- Gallery images.
- Activity images.
- Other non-critical page images.

should load progressively or use lazy loading after the landing page becomes available.

### Minimum Animation Duration

The animation should have a short minimum display duration so that it does not appear and disappear too quickly on fast connections.

Recommended behaviour:

- Minimum display duration: approximately 1.5 to 2 seconds.
- If the critical resources load before the minimum duration, allow the animation to complete naturally.
- If the critical resources take longer, continue displaying the loading animation until they are ready.
- Once both the minimum duration and critical loading requirements are satisfied, complete the animation and reveal the landing page.

The loading screen must not unnecessarily keep the visitor waiting only because the animation has not finished.

### Runner Behaviour

The SVG runner should:

- Start slightly outside or near the left edge of the screen.
- Run horizontally across the loading screen.
- Have visible running movement rather than simply sliding a static SVG across the screen.
- Animate the arms and legs to create the appearance of running.
- Maintain smooth movement across different screen sizes.
- Accelerate slightly when entering if it improves the visual effect.
- Complete the run near or beyond the right edge of the screen.

The SVG should use simple shapes or paths to keep the animation lightweight.

### Light / Lightning Trail

The runner should leave a visual trail behind while moving.

The trail may include:

- A glowing line.
- A lightning-style energy trail.
- A motion blur effect.
- Small fading particles.

The effect should remain lightweight and should not negatively affect website performance.

The trail should gradually disappear after the runner passes.

The trail should use colors that complement the website's visual identity, especially:

- Blue
- Gold
- Red

Avoid excessive effects that make the loading screen visually distracting.

### Loading Screen Background

The loading screen should use a dark or blue-based background that allows the runner and light trail to remain clearly visible.

The loading screen should cover the entire viewport and prevent interaction with the website until the initial loading process is complete.

### Transition to the Landing Page

When loading is complete:

1. The runner should complete its movement.
2. The light trail should fade or transition smoothly.
3. The loading screen should fade out.
4. The landing page should fade in smoothly.

The transition should not abruptly remove the loading screen.

### Session Behaviour

The full loading animation should only appear once during the current browser session.

Recommended behaviour:

First Visit During Session

↓

Show Full Runner Animation

↓

Mark Animation as Viewed Using `sessionStorage`

↓

User Navigates Between Website Pages

↓

Do Not Show Animation Again

If the user refreshes the page during the same browser session, the full animation may be skipped or replaced with a much shorter loading transition.

When the browser session ends and the visitor returns later, the full animation may be shown again.

### Accessibility

The loading animation should respect the visitor's reduced-motion preference.

If the user has enabled `prefers-reduced-motion`:

- Do not play the full running animation.
- Use a simple loading indicator or short fade transition instead.
- Avoid flashing or rapidly changing visual effects.

### Responsive Behaviour

The animation must work on:

- Desktop
- Tablet
- Mobile

The runner size and movement distance should adapt to the viewport size.

The runner should not become too large on mobile screens or too small on large desktop screens.

### Performance Requirements

- Prefer an inline or locally stored SVG.
- Avoid large video files or GIF animations.
- Keep the SVG lightweight.
- Use GPU-friendly CSS transforms where possible.
- Avoid excessive JavaScript animation loops.
- Prefer CSS animations or Framer Motion for the main movement.
- The animation must not significantly increase the initial page load time.

### Implementation Preference

Preferred technologies:

- SVG for the runner.
- CSS animations or Framer Motion for movement.
- CSS/SVG effects for the light trail.
- React state for controlling the loading lifecycle.
- `sessionStorage` for remembering whether the visitor has already viewed the animation during the current session.

The implementation should remain modular.

Suggested component responsibility:

`LoadingScreen`

- Controls the complete loading experience.

`RunnerAnimation`

- Contains and animates the SVG runner.

`LightTrail`

- Handles the glowing or lightning trail effect.

The exact implementation may be adjusted if a simpler approach provides the same visual result with better performance.

The landing page is the first page visitors see when they open the website.

The hero section should display "Aditya Athletics" in a large font size. The first "A" should include a hidden event listener:

- Mobile: long press
- Desktop: triple click

This hidden gesture will activate the admin panel.

### Home Page Buttons

The home page should include two main buttons placed in the middle of the screen next to each other.

#### Join Club

This button should direct users to:

<https://www.getorgtree.com/login?school=aditya-university>

Before redirecting, the website should show a small pop-up asking whether the visitor is a student of Aditya University.

- If the visitor selects "Yes", redirect them to Orgtree.
- If the visitor selects "No", show an error message explaining that they are not authorized to join the club, then return them to the home page.

#### Explore Gallery

This button should navigate to the gallery page.

### Home Page Navigation Links

On large screens, these links should appear in a sticky navbar at the top of the screen.

On small screens, they should appear at the bottom of the screen.

#### Coaches

Navigates to the leaders page. The leaders page should contain cards for the president and other club hierarchy members.

The page should also include a "See Club Members" button that directs users to:

<https://www.getorgtree.com/clubs?school=aditya-university>

The leaders page hero heading should be:

Our Coaches and Mentors

#### Activities

Navigates to the gallery page, which contains images related to daily activities.

#### About Us

This page should explain why the club exists and describe the athletics events practiced at Aditya University.

#### What We Do

This page should outline the activities the club provides. Each activity should include a related picture.

## Website Colors

These colors apply to the whole website.

### Blue

The dominant color. It represents openness and warmth. It should be used mostly on pages without background images and may use different intensities or gradients to create an energetic feeling. It may also transition with red for warmth.

### Gold

Used to highlight important buttons, active navbar links, active filters, and other important interface elements.

### White

Used for empty space, readable content areas, and text on dark backgrounds.

### Red

Used mainly for card borders, gallery filters, and section endings. It may transition smoothly into black where appropriate.

### Black

Used to complement white space, support gradients, and provide text variation on light backgrounds.

## Home Page Background

- The home page should use slightly blurred background images that remain visible.
- Background images should rotate every 3 seconds.
- Default images should come from the `public` folder.
- Text on image backgrounds should use a transparent blurred background to improve readability.

## Sticky Navbar

- The navbar should have rounded borders.
- It should use red borders and a transparent background.
- It should highlight the current page.
- On mobile, if all items do not fit, show only the items that fit and place the rest inside a hamburger menu.
- On mobile, each navbar item should include a representative icon, such as a home icon for the home page.

## Activity / Gallery Page

This page displays a gallery of images with captions.

Gallery filters should include:

- Track
- Field
- Workouts
- Achievements

Below the gallery, include a "See More" section with social media icons linking to:

- Instagram
- YouTube
- LinkedIn
- Facebook
- Twitter/X

## About Page and Leaders

The About page and leaders section may be combined. The leaders should appear after a brief introduction.

Suggested intro:

"This is the official Aditya University Athletics Club. We do not only build sports stars; we also care deeply about teamwork, health, and the growth of every individual. With the help of our trained professional coaches, we create an environment where everyone feels a sense of belonging. Come through and feel what it means to be part of one Aditya, one family. Explore what we do every day, check out the gallery, and meet the leaders who guide us."

The page should include:

- A "What We Do" link.
- A gallery link.
- A "Check Out Our Leaders" button that navigates to the leaders section or leaders page.

## What We Do Page

This page should present the activities and services offered by the club.

Possible activities include:

1. Health and fitness coaching, including gym training, running, and general wellness.
2. Professional athletics training for track and field events.
3. Taekwondo, gymnastics, and related physical training.
4. Sprint training.
5. Middle-distance and long-distance running.
6. Relay training.
7. Jumping events, including long jump and high jump.
8. Throwing events, including shot put, discus, and javelin.
9. Warm-up, mobility, and injury-prevention sessions.
10. Competition preparation and team practice.

## Contact Page

The contact page should include:

- Social media icons.
- WhatsApp phone number highlighted in green.
- A Join Club button using the same join flow described above.

## Footer

The footer should include:

- Social media icons.
- A note showing that the website is maintained and was built this year.
- A "Website powered by Orgtree Systems" link:

<https://liber.getorgtree.com/>

# Content Management Dashboard

The Content Management Dashboard is a hidden section of the website used by the club's Social Media Officer or authorized club leaders to keep website content fresh without modifying the source code.

The dashboard is not responsible for member management, authentication of club members, or communication. These responsibilities belong to Orgtree.

The dashboard's sole responsibility is managing the website's visual content.

## Purpose

The dashboard allows authorized personnel to:

- Manage gallery images.
- Manage the home page background slideshow.
- Upload new images.
- Edit image captions.
- Categorize gallery images.
- Remove outdated images.
- View basic gallery statistics.

## Authentication

The dashboard should be hidden from normal visitors.

### Access Flow

1. The user performs the hidden activation gesture:
   - Mobile: long press on the first "A" in the "Aditya Athletics" hero title.
   - Desktop: triple click on the first "A" in the hero title.
2. A secure login dialog appears.
3. Only authorized personnel can continue.
4. After successful authentication, the Content Management Dashboard opens.

### Security Note

Passwords must never be hardcoded inside the production React application.

Authentication should use a secure service such as:

- Cloudinary authentication
- Firebase Authentication
- Google Sign-In restricted to authorized email addresses

### Temporary Authentication

During development, the dashboard may use a temporary hardcoded password to speed up implementation.

This should be replaced by Firebase Authentication during Sprint 6.

Reason: the primary objective is to complete the Content Management Dashboard functionality before integrating production authentication.

## Dashboard Sections

### 1. Overview

Displays quick information about the website.

Example:

- Total gallery images
- Home background images
- Latest uploaded image
- Storage usage, if available
- Last updated date

### 2. Gallery Manager

Displays every gallery image as a card.

Each card contains:

- Image preview
- Caption
- Category
- Upload date
- Edit button
- Delete button

Gallery categories include:

- Track
- Field
- Workouts
- Achievements

Features:

- Search images
- Filter by category
- Edit caption
- Change category
- Delete image

### 3. Home Background Manager

Responsible for managing the rotating images displayed on the landing page.

Features:

- View current background images
- Upload new background image
- Replace existing background image
- Delete background image
- Reorder images
- Preview background rotation

### 4. Upload Image

The upload form should contain:

- Image file
- Caption
- Category selection
- Preview
- Upload button

Categories:

- Track
- Field
- Workouts
- Achievements
- Home Background

After a successful upload:

1. The image is stored in Cloudinary.
2. The website automatically displays the new image.
3. No website rebuild or redeployment is required.

### 5. Image Preview

Before uploading, the administrator should see:

- Image preview
- File name
- File size
- Selected category
- Caption preview

This helps prevent accidental uploads.

### 6. Delete Images

Deleting an image should require confirmation.

Flow:

1. User clicks "Delete Image".
2. A confirmation dialog appears.
3. The dialog asks, "Are you sure?"
4. If the user selects "Yes", delete the image from Cloudinary.
5. If the user selects "No", cancel the action.

### 7. Logout

The dashboard should provide a Logout button.

Logging out should immediately remove access to all dashboard functionality.

## Dashboard Design

The dashboard should follow the same design language as the website.

Theme:

- Blue primary theme
- Gold highlights
- White cards
- Red action buttons
- Rounded corners
- Responsive layout

## Cloudinary Integration

Cloudinary is responsible for storing all website images.

The dashboard communicates directly with Cloudinary to:

- Upload images.
- Replace images.
- Delete images.
- Retrieve gallery images.
- Retrieve home background images.

The website should automatically load images from Cloudinary whenever a visitor opens the website.

## Dashboard Workflow

1. Authorized user performs the hidden activation gesture.
2. Login screen appears.
3. Authentication succeeds.
4. Dashboard opens.
5. User selects one of the dashboard sections:
   - Overview
   - Gallery Manager
   - Home Background Manager
   - Upload Image
   - Logout
6. User uploads, edits, or deletes images.
7. Changes are stored in Cloudinary.
8. The website automatically reflects the updated content.

## Security Notes

- The dashboard must never be accessible through the normal website navigation.
- Authentication credentials must never be stored in the production React source code.
- Only authorized club officials should have access.
- All image operations should require successful authentication.

## Future Dashboard Improvements

- News management
- Event management
- Leadership management
- Website announcements
- Analytics dashboard
- Multiple administrator accounts
- Audit log of uploaded images
