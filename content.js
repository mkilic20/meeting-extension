let costData = {};
let currentObserver = null;
let lastKnownCost = 0;
let isProcessing = false;

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    if (isProcessing) return;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      isProcessing = true;
      func.apply(this, args);
      isProcessing = false;
    }, wait);
  };
}

function setupEventListeners() {
  console.log('Setting up event listeners...');
  // Listen for clicks on calendar events
  document.addEventListener('click', debounce((event) => {
    const eventElement = event.target.closest('[role="button"], [role="link"]');
    if (eventElement) {
      console.log('Calendar event clicked:', eventElement);
      setTimeout(checkForEventDialog, 100);
    }
  }, 250));

  setupBackupObserver();
}

function checkForEventDialog() {
  const eventDialog = document.querySelector('.ecHOgf.RDlrG.Inn9w.iWO5td');
  if (eventDialog) {
    console.log('Event dialog found');
    initializeEventPage(eventDialog);
  }
}

function setupBackupObserver() {
  if (currentObserver) {
    currentObserver.disconnect();
  }

  currentObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        const eventDialog = document.querySelector('.ecHOgf.RDlrG.Inn9w.iWO5td');
        if (eventDialog) {
          console.log('Event dialog detected through mutation observer');
          initializeEventPage(eventDialog);
          break;
        }
      }
    }
  });

  const calendarContainer = document.querySelector('[role="main"]');
  if (calendarContainer) {
    currentObserver.observe(calendarContainer, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }
}

function initializeEventPage(eventDialog) {
  console.log('Initializing event page...');
  createCostDisplay(eventDialog);
  calculateAndDisplayCost(eventDialog);
}

function calculateAndDisplayCost(eventDialog) {
  console.log('Calculating costs...');
  const uniqueEmails = new Set();
  let totalCost = 0;

  // Get meeting duration
  const duration = getMeetingDuration(eventDialog);
  console.log('Meeting duration:', duration);

  // Only search within the current event dialog
  const participants = eventDialog.querySelectorAll('.nBzcnc.Wm6kRe[data-email]');
  console.log(`Found ${participants.length} participants`);

  participants.forEach(participant => {
    const email = participant.getAttribute('data-email');
    if (!email || email.includes('resource.calendar.google.com') || uniqueEmails.has(email)) {
      console.log('Skipping participant:', email);
      return;
    }
    
    console.log('Processing participant:', email);
    uniqueEmails.add(email);
    let hourlyRate = costData.defaultCost;
    if (email in costData.highLevelEmployees) {
      hourlyRate = costData.highLevelEmployees[email];
    } else if (email in costData.lowLevelEmployees) {
      hourlyRate = costData.lowLevelEmployees[email];
    }
    
    const participantCost = (hourlyRate * duration.hours);
    totalCost += participantCost;
    
    // Add individual cost display
    addParticipantCost(participant, participantCost);
    
    console.log(`Added cost for ${email}: ${participantCost} (${hourlyRate}/hour * ${duration.hours} hours)`);
  });

  console.log('Total cost calculated:', totalCost);
  if (totalCost !== lastKnownCost) {
    console.log('Cost changed, updating display');
    lastKnownCost = totalCost;
    updateCostDisplay(totalCost, duration);
  }
}

function addParticipantCost(participantElement, cost) {
  // Find or create the cost display element
  let costElement = participantElement.querySelector('.participant-cost');
  if (!costElement) {
    costElement = document.createElement('div');
    costElement.className = 'participant-cost';
    
    // Find the name/details container
    const detailsContainer = participantElement.querySelector('.toUqff');
    if (detailsContainer) {
      // Insert after the details container
      detailsContainer.insertAdjacentElement('afterend', costElement);
    }
  }
  
  costElement.innerHTML = `
    <span class="individual-cost">⭐ $${cost.toFixed(2)}</span>
  `;
}

function getMeetingDuration(eventDialog) {
  console.log('Getting meeting duration...');
  
  // Find the time container
  const timeContainer = eventDialog.querySelector('.i04qJ');
  if (!timeContainer) {
    console.log('Time container not found, using default duration');
    return { hours: 1, minutes: 0, display: '1h 0m' };
  }

  // Get start and end time elements
  const startTime = timeContainer.querySelector('[data-key="startTime"]');
  const endTime = timeContainer.querySelector('[data-key="endTime"]');
  
  if (!startTime || !endTime) {
    console.log('Start or end time not found, using default duration');
    return { hours: 1, minutes: 0, display: '1h 0m' };
  }

  // Parse times
  const start = parseTime(startTime.textContent);
  const end = parseTime(endTime.textContent);
  
  console.log('Start time:', start);
  console.log('End time:', end);

  // Calculate duration in minutes
  let durationMinutes = (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
  
  // Handle cases where meeting goes past midnight
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  console.log(`Duration calculated: ${hours}h ${minutes}m`);
  
  return {
    hours: hours + (minutes / 60),
    minutes: minutes,
    display: `${hours}h ${minutes}m`
  };
}

function parseTime(timeString) {
  console.log('Parsing time:', timeString);
  
  // Remove any whitespace
  timeString = timeString.trim();
  
  // Extract hours, minutes, and period (am/pm)
  const match = timeString.match(/(\d+)(?::(\d+))?\s*(am|pm)/i);
  if (!match) {
    console.log('Could not parse time string');
    return { hours: 0, minutes: 0 };
  }

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2] || '0');
  const period = match[3].toLowerCase();

  // Convert to 24-hour format
  if (period === 'pm' && hours < 12) {
    hours += 12;
  } else if (period === 'am' && hours === 12) {
    hours = 0;
  }

  console.log(`Parsed time: ${hours}:${minutes}`);
  return { hours, minutes };
}

function createCostDisplay(eventDialog) {
  console.log('Creating cost display...');
  let costDisplay = document.getElementById('total-cost-display');
  
  if (!costDisplay) {
    console.log('Creating new cost display element');
    costDisplay = document.createElement('div');
    costDisplay.id = 'total-cost-display';
    
    // Try multiple possible container selectors
    const possibleContainers = [
      '[jsname="B5dxMb"]',          // Buttons container
      '.BTotkb',                    // Original buttons container
      '.JaKw1',                     // Alternative buttons container
      '[jsname="c6xFrd"]',          // Parent container
      '[aria-label="Event details"]' // Event details container
    ];

    let container = null;
    for (const selector of possibleContainers) {
      container = eventDialog.querySelector(selector);
      if (container) {
        console.log(`Found container using selector: ${selector}`);
        break;
      }
    }

    if (container) {
      // Insert before the container
      container.parentElement.insertBefore(costDisplay, container);
      console.log('Cost display element inserted before container');
    } else {
      // Fallback: append to event dialog
      console.log('No suitable container found, appending to event dialog');
      eventDialog.appendChild(costDisplay);
    }
  } else {
    console.log('Cost display already exists');
  }
  
  return costDisplay;
}

function updateCostDisplay(totalCost, duration) {
  console.log('Updating cost display:', totalCost);
  let costDisplay = document.getElementById('total-cost-display');
  if (!costDisplay) {
    console.log('Cost display element not found');
    return;
  }
  
  costDisplay.innerHTML = `
    <div class="cost-content">
      <div class="cost-details">
        <span class="cost-label">Meeting Cost</span>
        <span class="duration-label">(${duration.display})</span>
      </div>
      <span class="cost-value">${totalCost.toFixed(2)}</span>
    </div>
  `;
  console.log('Cost display updated');
}

function cleanup() {
  console.log('Cleaning up...');
  if (currentObserver) {
    currentObserver.disconnect();
    currentObserver = null;
    console.log('Observer disconnected');
  }
  const costDisplay = document.getElementById('total-cost-display');
  if (costDisplay) {
    costDisplay.remove();
    console.log('Cost display removed');
  }
}

async function initialize() {
  console.log('Initializing extension...');
  try {
    if (!costData.defaultCost) {
      console.log('Loading cost data...');
      const response = await fetch(chrome.runtime.getURL("data.json"));
      costData = await response.json();
      console.log('Cost data loaded:', costData);
    }
    setupEventListeners();
  } catch (error) {
    console.error('Cost Calculator: Init failed:', error);
  }
}

// Start initialization
if (document.readyState === 'loading') {
  console.log('Document still loading, waiting...');
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  console.log('Document already loaded, initializing...');
  initialize();
}

// Handle navigation
window.addEventListener('popstate', debounce(() => {
  console.log('Navigation detected');
  cleanup();
  initialize();
}, 500));
  