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
    updateCalendar(); // Refresh calendar after loading entries
  });
  
  // Set up event listeners
  setupEventListeners();
  
  // Add subtle animation to mood emojis on start
  animateEmojisOnStart();
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

// Save entry with visual feedback
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
    
    // Add animation to the textarea to indicate successful save
    journalEntry.style.transition = 'all 0.3s ease';
    journalEntry.style.boxShadow = '0 0 0 2px rgba(52, 211, 153, 0.5)';
    setTimeout(() => {
      journalEntry.style.boxShadow = '';
    }, 1000);
  });
}

// Update word count with animation
function updateWordCount() {
  const text = journalEntry.value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  
  // Animate the word count update
  wordCount.style.transition = 'all 0.3s ease';
  wordCount.style.transform = 'scale(1.1)';
  wordCount.textContent = `${words} words`;
  
  setTimeout(() => {
    wordCount.style.transform = 'scale(1)';
  }, 300);
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

// Animate emojis on start for visual appeal
function animateEmojisOnStart() {
  emojiButtons.forEach((btn, index) => {
    setTimeout(() => {
      btn.style.transform = 'scale(1.2) rotate(5deg)';
      setTimeout(() => {
        btn.style.transform = '';
      }, 300);
    }, index * 100);
  });
}

// Generate calendar with proper sizing
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
    
    // Add click event with animation
    dayElement.addEventListener('click', () => {
      // Remove selected class from all days
      document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected');
      });
      
      // Add selected class to this day
      dayElement.classList.add('selected');
      
      // Update selected date
      selectedDate = new Date(year, month, day);
      
      // Add animation
      dayElement.style.transform = 'scale(1.1)';
      setTimeout(() => {
        dayElement.style.transform = '';
        switchToEditor();
        loadEntry(dateKey);
      }, 300);
    });
    
    calendarDays.appendChild(dayElement);
  }
}

// Switch to editor view with animation
function switchToEditor() {
  calendarView.classList.remove('active');
  setTimeout(() => {
    editorView.classList.add('active');
  }, 50);
}

// Switch to calendar view with animation
function switchToCalendar() {
  editorView.classList.remove('active');
  setTimeout(() => {
    calendarView.classList.add('active');
    updateCalendar();
  }, 50);
}

// Export all entries with better formatting
function exportAllEntries() {
  chrome.storage.local.get(null, (data) => {
    // Convert data to a more readable format
    const formattedData = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (key.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Format date for display
        const dateParts = key.split('-');
        const formattedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
          .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        formattedData[formattedDate] = {
          text: value.text,
          mood: value.mood,
          timestamp: new Date(value.timestamp).toLocaleString()
        };
      }
    }
    
    // Format the data
    const exportData = JSON.stringify(formattedData, null, 2);
    
    // Create a download link
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create and click a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `mini_journal_export_${formatDate(new Date())}.json`;
    document.body.appendChild(a);
    
    // Add visual feedback
    exportAllBtn.style.transform = 'scale(1.1)';
    setTimeout(() => {
      exportAllBtn.style.transform = '';
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 300);
  });
}

// Set up event listeners
function setupEventListeners() {
  // Text input events
  journalEntry.addEventListener('input', updateWordCount);
  
  // Save button with hover effect
  saveEntryBtn.addEventListener('mouseover', () => {
    saveEntryBtn.style.transform = 'translateY(-2px)';
  });
  
  saveEntryBtn.addEventListener('mouseout', () => {
    saveEntryBtn.style.transform = '';
  });
  
  saveEntryBtn.addEventListener('click', saveEntry);
  
  // Export button
  exportAllBtn.addEventListener('click', exportAllEntries);
  
  // Mood buttons with enhanced interaction
  emojiButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Determine if this mood is already selected
      const wasSelected = selectedMood === btn.dataset.mood;
      
      // Reset all buttons
      emojiButtons.forEach(b => b.classList.remove('selected'));
      
      // Toggle the selected mood
      if (wasSelected) {
        selectedMood = null;
      } else {
        selectedMood = btn.dataset.mood;
        btn.classList.add('selected');
        
        // Add a little bounce animation
        btn.style.transform = 'scale(1.2) rotate(10deg)';
        setTimeout(() => {
          btn.style.transform = 'scale(1.1)';
        }, 200);
      }
      
      saveEntry();
    });
  });
  
  // View toggles with animations
  calendarButton.addEventListener('click', () => {
    if (editorView.classList.contains('active')) {
      switchToCalendar();
    } else {
      switchToEditor();
    }
  });
  
  // Theme toggle with animation
  themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    
    // Add rotation animation
    themeToggle.style.transition = 'transform 0.5s ease';
    themeToggle.style.transform = 'rotate(360deg)';
    
    setTimeout(() => {
      themeToggle.style.transform = '';
      updateTheme();
    }, 300);
  });
  
  // Month navigation with smooth transitions
  prevMonthButton.addEventListener('click', () => {
    // Animation
    calendarDays.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    calendarDays.style.transform = 'translateX(20px)';
    calendarDays.style.opacity = '0';
    
    setTimeout(() => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      updateCalendar();
      
      calendarDays.style.transform = 'translateX(-20px)';
      
      requestAnimationFrame(() => {
        calendarDays.style.transform = 'translateX(0)';
        calendarDays.style.opacity = '1';
      });
    }, 300);
  });
  
  nextMonthButton.addEventListener('click', () => {
    // Animation
    calendarDays.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    calendarDays.style.transform = 'translateX(-20px)';
    calendarDays.style.opacity = '0';
    
    setTimeout(() => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      updateCalendar();
      
      calendarDays.style.transform = 'translateX(20px)';
      
      requestAnimationFrame(() => {
        calendarDays.style.transform = 'translateX(0)';
        calendarDays.style.opacity = '1';
      });
    }, 300);
  });
  
  // Auto-save when popup closes
  window.addEventListener('blur', saveEntry);
  
  // Prevent text selection on buttons and calendar days
  document.querySelectorAll('button, .calendar-day').forEach(el => {
    el.addEventListener('mousedown', e => {
      if (e.target.classList.contains('calendar-day') || e.target.tagName === 'BUTTON') {
        e.preventDefault();
      }
    });
  });
}

// Update theme with transition effect
function updateTheme() {
  document.body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
  
  if (isDarkMode) {
    document.body.setAttribute('data-theme', 'dark');
    
    // Update moon icon
    const themeIcon = themeToggle.querySelector('svg path');
    if (themeIcon) {
      themeIcon.setAttribute('d', 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z');
    }
  } else {
    document.body.removeAttribute('data-theme');
    
    // Update sun icon
    const themeIcon = themeToggle.querySelector('svg path');
    if (themeIcon) {
      themeIcon.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
    }
  }
}

// Handle theme preference changes from system
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  isDarkMode = e.matches;
  updateTheme();
});

// Add focus/blur effects to textarea
journalEntry.addEventListener('focus', () => {
  journalEntry.parentElement.style.boxShadow = '0 8px 24px var(--shadow), 0 0 0 2px var(--highlight)';
});

journalEntry.addEventListener('blur', () => {
  journalEntry.parentElement.style.boxShadow = '0 4px 12px var(--shadow)';
});

// Add smooth scrolling to textarea
journalEntry.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = journalEntry.selectionStart;
    const end = journalEntry.selectionEnd;
    
    // Insert tab at cursor
    journalEntry.value = journalEntry.value.substring(0, start) + '    ' + journalEntry.value.substring(end);
    
    // Move cursor after tab
    journalEntry.selectionStart = journalEntry.selectionEnd = start + 4;
    
    // Trigger word count update
    updateWordCount();
  }
});

// Handle browser back button
window.addEventListener('popstate', () => {
  if (calendarView.classList.contains('active')) {
    switchToEditor();
    history.pushState(null, document.title, window.location.href);
  }
});

// Add notification for saved entry
function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add to body
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateY(0)';
    notification.style.opacity = '1';
  }, 10);
  
  // Animate out and remove
  setTimeout(() => {
    notification.style.transform = 'translateY(-20px)';
    notification.style.opacity = '0';
    
    // Remove from DOM after animation
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 2000);
}

// Initialize on DOM loaded
document.addEventListener('DOMContentLoaded', init);