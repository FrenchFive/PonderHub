import './style.css';
import { render, initHistoryNavigation, scheduleWordNotifications } from './app';

render();
initHistoryNavigation();

// Reschedule notifications on each app launch (picks new random words)
scheduleWordNotifications();
