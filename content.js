let costData = {};

async function initialize() {
  console.log('Calendar Cost Extension: Initializing...');
  try {
    const response = await fetch(chrome.runtime.getURL("data.json"));
    costData = await response.json();
    console.log('Calendar Cost Extension: Data loaded successfully', costData);
    setupObserver();
  } catch (error) {
    console.error('Calendar Cost Extension: Failed to load cost data:', error);
  }
}

function setupObserver() {
  console.log('Calendar Cost Extension: Setting up observer...');
  
  // Use requestAnimationFrame to throttle observer callbacks
  let ticking = false;

  const observer = new MutationObserver((mutations) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        // Check for create event dialog with specific class
        const createEventDialog = document.querySelector('.ecHOgf.RDlrG.Inn9w.iWO5td');
        if (createEventDialog) {
          console.log('Calendar Cost Extension: Create Event dialog detected with specific classes!');
          initializeEventPage();
        }
        
        // Keep existing checks as fallback
        const eventDetails = document.querySelector('[aria-label="Event details"]');
        if (eventDetails) {
          console.log('Calendar Cost Extension: Event details found, initializing...');
          initializeEventPage();
        }
        
        ticking = false;
      });
      
      ticking = true;
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  // Initial check
  requestAnimationFrame(() => {
    if (document.querySelector('.ecHOgf.RDlrG.Inn9w.iWO5td')) {
      console.log('Calendar Cost Extension: Create Event dialog found on initial check (specific classes)');
      initializeEventPage();
    }
  });
}

function createCostDisplay() {
  let costDisplay = document.getElementById('total-cost-display');
  
  if (!costDisplay) {
    costDisplay = document.createElement('div');
    costDisplay.id = 'total-cost-display';
    
    // Try multiple possible container selectors
    const possibleContainers = [
      '.BTotkb',                    // Original buttons container
      '.JaKw1',                     // Alternative buttons container
      '[jsname="c6xFrd"]',         // Parent container
      '[aria-label="Event details"]' // Event details container
    ];

    let container = null;
    for (const selector of possibleContainers) {
      container = document.querySelector(selector);
      if (container) break;
    }

    if (container) {
      // Insert before the container
      container.parentElement.insertBefore(costDisplay, container);
    } else {
      // Fallback: Try to insert into the event details section
      const eventDetails = document.querySelector('[aria-label="Event details"]');
      if (eventDetails) {
        eventDetails.insertBefore(costDisplay, eventDetails.firstChild);
      }
    }
  }
}

function initializeEventPage() {
  console.log('Calendar Cost Extension: Initializing event page...');
  
  // Look for the participants container with multiple possible selectors
  const participantContainer = document.querySelector([
    '[aria-label="Event details"]',
    '.ecHOgf.RDlrG.Inn9w.iWO5td',
    '[jscontroller="UWz6dd"]'  // This is often the participant controller
  ].join(', '));
  
  if (!participantContainer) {
    console.log('Calendar Cost Extension: Participant container not found');
    return;
  }

  console.log('Calendar Cost Extension: Found participant container');

  // Remove any existing observers
  if (participantContainer._observer) {
    participantContainer._observer.disconnect();
  }

  // Create new observer specifically for participants
  const observer = new MutationObserver(() => {
    console.log('Calendar Cost Extension: Participant change detected');
    requestAnimationFrame(monitorParticipants);
  });
  
  participantContainer._observer = observer;
  
  observer.observe(participantContainer, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-email']  // Watch specifically for email attributes
  });

  // Initial calculation
  console.log('Calendar Cost Extension: Running initial participant check');
  monitorParticipants();
}

function monitorParticipants() {
  console.log('Calendar Cost Extension: Monitoring participants...');
  
  // Use a Set to store unique emails
  const uniqueEmails = new Set();
  
  // Look for participants in the guest list container
  const participants = Array.from(
    document.querySelectorAll([
      '[jsname="MsyPn"] [data-email]',  // Main guest list container
      '.nBzcnc.Wm6kRe[data-email]',     // Individual guest items
      '.Zce9sc[data-email]'             // Another guest item class
    ].join(', '))
  );
  
  console.log('Calendar Cost Extension: Found participant elements:', participants);
  
  let totalCost = 0;
  participants.forEach(participant => {
    const email = participant.getAttribute('data-email');
    
    // Skip resource calendars and already counted participants
    if (email && 
        !email.includes('resource.calendar.google.com') && 
        !uniqueEmails.has(email)) {
      
      uniqueEmails.add(email); // Add to set of processed emails
      console.log('Calendar Cost Extension: Processing participant:', email);
      
      if (email in costData.highLevelEmployees) {
        totalCost += costData.highLevelEmployees[email];
        console.log(`Calendar Cost Extension: Added high level cost for ${email}: ${costData.highLevelEmployees[email]}`);
      } else if (email in costData.lowLevelEmployees) {
        totalCost += costData.lowLevelEmployees[email];
        console.log(`Calendar Cost Extension: Added low level cost for ${email}: ${costData.lowLevelEmployees[email]}`);
      } else {
        totalCost += costData.defaultCost;
        console.log(`Calendar Cost Extension: Added default cost for ${email}: ${costData.defaultCost}`);
      }
    }
  });

  console.log('Calendar Cost Extension: Total cost calculated:', totalCost);
  updateCostDisplay(totalCost);
}

function updateCostDisplay(totalCost) {
  console.log('Calendar Cost Extension: Updating cost display:', totalCost);
  let costDisplay = document.getElementById('total-cost-display');
  
  if (!costDisplay) {
    console.log('Calendar Cost Extension: Creating new cost display element');
    costDisplay = document.createElement('div');
    costDisplay.id = 'total-cost-display';
    
    // Try to find the container
    const container = document.querySelector('.BTotkb') || 
                     document.querySelector('.JaKw1') ||
                     document.querySelector('[jsname="c6xFrd"]');
    
    if (container) {
      console.log('Calendar Cost Extension: Found container, inserting cost display');
      container.parentElement.insertBefore(costDisplay, container);
    } else {
      console.log('Calendar Cost Extension: No container found, appending to event details');
      const eventDetails = document.querySelector('[aria-label="Event details"]');
      if (eventDetails) {
        eventDetails.insertBefore(costDisplay, eventDetails.firstChild);
      }
    }
  }
  
  // Update the content with proper structure
  costDisplay.innerHTML = `
    <div class="cost-content">
      <span class="cost-label">Meeting Cost</span>
      <span class="cost-value">${totalCost}</span>
    </div>
  `;
}

// Start the initialization
initialize();

// Also try to initialize when the page loads
document.addEventListener('DOMContentLoaded', initialize);
// And when the URL changes (for single-page-app navigation)
window.addEventListener('popstate', initialize);
  