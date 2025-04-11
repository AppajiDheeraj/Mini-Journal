// DOM Elements
const journalEntry = document.getElementById('journalEntry');
const wordCount = document.getElementById('wordCount');
const saveEntryBtn = document.getElementById('saveEntry');
const exportAllBtn = document.getElementById('exportAll');
const emojiButtons = document.querySelectorAll('.emoji-btn');
const editorView = document.getElementById('editorView');
const calendarView = document.getElementById('calendarView');
const calendarButton = document.getElementById('calendarButton');
const themeToggle = document.getElementById('themeToggle');
const calendarDays = document.getElementById('calendarDays');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthButton = document.getElementById('prevMonth');
const nextMonthButton = document.getElementById('nextMonth');

// Global variables
let currentDate = new Date();
let selectedDate = new Date();
let selectedMood = null;
let currentEntries = {};
let isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

// Initialize the extension
function init() {
  // Set the initial theme
  updateTheme();
  
  // Load today's entry if exists
  loadEntry(formatDate(selectedDate));
  
  // Generate calendar
  updateCalendar();
  
  // Load all entries from storage
  chrome.storage.local.get(null, (data) => {
    currentEntries = data;
  });
  
  // Set up event listeners
  setupEventListeners();
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format date for display
function formatDisplayDate(date) {
  const options = { year: 'numeric', month: 'long' };
  return date.toLocaleDateString('en-US', options);
}

// Load entry for specific date
function loadEntry(dateKey) {
  chrome.storage.local.get(dateKey, (result) => {
    if (result[dateKey]) {
      const entry = result[dateKey];
      journalEntry.value = entry.text || '';
      selectedMood = entry.mood;
      updateMoodButtons();
    } else {
      journalEntry.value = '';
      selectedMood = null;
      updateMoodButtons();
    }
    updateWordCount();
  });
}

// Save entry
function saveEntry() {
  const dateKey = formatDate(selectedDate);
  const text = journalEntry.value.trim();
  
  const entry = {
    text: text,
    mood: selectedMood,
    timestamp: new Date().toISOString()
  };
  
  // If text is empty and no mood selected, remove the entry
  if (!text && !selectedMood) {
    chrome.storage.local.remove(dateKey, () => {
      console.log('Empty entry removed');
    });
    return;
  }
  
  // Save to Chrome storage
  chrome.storage.local.set({ [dateKey]: entry }, () => {
    console.log('Entry saved');
    // Update the currentEntries object
    currentEntries[dateKey] = entry;
    
    // Animate the save button to give feedback
    saveEntryBtn.classList.add('saved');
    setTimeout(() => {
      saveEntryBtn.classList.remove('saved');
    }, 1000);
    
    // Update calendar if in view
    if (calendarView.classList.contains('active')) {
      updateCalendar();
    }
  });
}

// Update word count
function updateWordCount() {
  const text = journalEntry.value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  wordCount.textContent = `${words} words`;
}

// Update mood buttons
function updateMoodButtons() {
  emojiButtons.forEach(btn => {
    btn.classList.remove('selected');
    if (selectedMood && btn.dataset.mood === selectedMood) {
      btn.classList.add('selected');
    }
  });
}

// Generate calendar
function updateCalendar() {
  calendarDays.innerHTML = '';
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Update month name
  currentMonthElement.textContent = formatDisplayDate(currentDate);
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    calendarDays.appendChild(emptyDay);
  }
  
  // Add cells for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = day;
    
    const dateObj = new Date(year, month, day);
    const dateKey = formatDate(dateObj);
    
    // Check if this date has an entry
    if (currentEntries[dateKey]) {
      dayElement.classList.add('has-entry');
      if (currentEntries[dateKey].mood) {
        dayElement.dataset.mood = currentEntries[dateKey].mood;
      }
    }
    
    // Highlight today
    if (dateObj.getDate() === new Date().getDate() && 
        dateObj.getMonth() === new Date().getMonth() && 
        dateObj.getFullYear() === new Date().getFullYear()) {
      dayElement.classList.add('today');
    }
    
    // Highlight selected date
    if (dateObj.getDate() === selectedDate.getDate() && 
        dateObj.getMonth() === selectedDate.getMonth() && 
        dateObj.getFullYear() === selectedDate.getFullYear()) {
      dayElement.classList.add('selected');
    }
    
    // Add click event
    dayElement.addEventListener('click', () => {
      selectedDate = new Date(year, month, day);
      switchToEditor();
      loadEntry(dateKey);
    });
    
    calendarDays.appendChild(dayElement);
  }
}

// Switch to editor view
function switchToEditor() {
  editorView.classList.add('active');
  calendarView.classList.remove('active');
}

// Switch to calendar view
function switchToCalendar() {
  editorView.classList.remove('active');
  calendarView.classList.add('active');
  updateCalendar();
}

// Export all entries
function exportAllEntries() {
  chrome.storage.local.get(null, (data) => {
    // Format the data
    const exportData = JSON.stringify(data, null, 2);
    
    // Create a download link
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create and click a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_export_${formatDate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Set up event listeners
function setupEventListeners() {
  // Text input events
  journalEntry.addEventListener('input', updateWordCount);
  
  // Save button
  saveEntryBtn.addEventListener('click', saveEntry);
  
  // Export button
  exportAllBtn.addEventListener('click', exportAllEntries);
  
  // Mood buttons
  emojiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (selectedMood === btn.dataset.mood) {
        selectedMood = null;
      } else {
        selectedMood = btn.dataset.mood;
      }
      updateMoodButtons();
      saveEntry();
    });
  });
  
  // View toggles
  calendarButton.addEventListener('click', () => {
    if (editorView.classList.contains('active')) {
      switchToCalendar();
    } else {
      switchToEditor();
    }
  });
  
  // Theme toggle
  themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    updateTheme();
  });
  
  // Month navigation
  prevMonthButton.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
  });
  
  nextMonthButton.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
  });
  
  // Auto-save when popup closes
  window.addEventListener('blur', saveEntry);
}

// Update theme
function updateTheme() {
  if (isDarkMode) {
    document.body.setAttribute('data-theme', 'dark');
  } else {
    document.body.removeAttribute('data-theme');
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', init);