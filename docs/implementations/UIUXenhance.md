UI/UX improvements:

1) ✅ FIXED: When a new chat is opened it opens at the top.
   - Added auto-scroll to bottom on initial load
   - Chat now opens with newest messages visible at bottom
   - Smooth scrolling to new messages when they arrive

2) ✅ FIXED: All messages are loaded - this is too much data just load the most recent 20 messages and have an option to load more by scrolling up
   - Changed pagination from 50 to 20 messages per page
   - "Load Older Messages" button appears when scrolling up
   - Auto-load on scroll for better UX

3) ✅ FIXED: The bottom nav icons is not aligned with the bottom bar
   - Removed duplicate labels from TabIcon component
   - Using native tab bar labels instead
   - Added proper padding and height (60px) to tab bar
   - Icons now properly aligned with labels below

4) ✅ FIXED: remove the AI quick actions tab on the bottom left
   - Removed Assistant tab from bottom navigation
   - Now shows 4 tabs: Chats, Schedule, Tasks, Profile
   - Assistant route still accessible programmatically if needed
