document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('referralForm');
    const saveBtn = document.getElementById('saveBtn');
    const referBtn = document.getElementById('referBtn');
    const autoReferBtn = document.getElementById('autoReferBtn');
    const loadAllJobsBtn = document.getElementById('loadAllJobsBtn');
    const clearBtn = document.getElementById('clearBtn');
    const statusDiv = document.getElementById('status');
    const contactsList = document.getElementById('contactsList');
    
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const locationInput = document.getElementById('location');
    const jobSearchTermInput = document.getElementById('jobSearchTerm');

    loadSavedContacts();

    // Event delegation for contact buttons
    contactsList.addEventListener('click', function(e) {
        const contactId = e.target.getAttribute('data-contact-id');
        const action = e.target.getAttribute('data-action');
        
        if (!contactId || !action) return;
        
        if (action === 'use') {
            useContact(contactId);
        } else if (action === 'delete') {
            deleteContact(contactId);
        }
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        saveContact();
    });

    saveBtn.addEventListener('click', function(e) {
        e.preventDefault();
        saveContact();
    });

    referBtn.addEventListener('click', function() {
        referToCurrentJob();
    });

    autoReferBtn.addEventListener('click', function() {
        autoReferAllMatchingJobs();
    });

    loadAllJobsBtn.addEventListener('click', function() {
        loadAllJobsAndRefer();
    });

    clearBtn.addEventListener('click', function() {
        clearForm();
    });

    function saveContact() {
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const location = locationInput.value.trim().toUpperCase();

        if (!firstName || !lastName || !email || !location) {
            showStatus('Please fill in all fields', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showStatus('Please enter a valid email address', 'error');
            return;
        }

        const jobSearchTerm = jobSearchTermInput.value.trim();

        const contact = {
            id: Date.now().toString(),
            firstName,
            lastName,
            email,
            location,
            jobSearchTerm,
            dateAdded: new Date().toISOString()
        };

        chrome.storage.local.get(['contacts'], function(result) {
            const contacts = result.contacts || [];
            
            const existingIndex = contacts.findIndex(c => c.email === email);
            if (existingIndex >= 0) {
                contacts[existingIndex] = contact;
                showStatus('Contact updated successfully', 'success');
            } else {
                contacts.push(contact);
                showStatus('Contact saved successfully', 'success');
            }

            chrome.storage.local.set({ contacts }, function() {
                loadSavedContacts();
                clearForm();
            });
        });
    }

    function referToCurrentJob() {
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const location = locationInput.value.trim().toUpperCase();

        if (!firstName || !lastName || !email || !location) {
            showStatus('Please fill in all fields before referring', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showStatus('Please enter a valid email address', 'error');
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const jobSearchTerm = jobSearchTermInput.value.trim();

        const referralData = {
                firstName,
                lastName,
                email,
                location,
                jobSearchTerm,
                action: 'fillReferralForm'
            };

            chrome.tabs.sendMessage(tabs[0].id, referralData, function(response) {
                if (chrome.runtime.lastError) {
                    showStatus('Please navigate to your employee portal job page', 'error');
                } else if (response && response.success) {
                    showStatus('Referral form filled successfully!', 'success');
                } else {
                    showStatus('Could not fill referral form. Make sure you\'re on a job page.', 'error');
                }
            });
        });
    }

    function clearForm() {
        firstNameInput.value = '';
        lastNameInput.value = '';
        emailInput.value = '';
        locationInput.value = '';
        jobSearchTermInput.value = '';
        hideStatus();
    }

    function loadSavedContacts() {
        chrome.storage.local.get(['contacts'], function(result) {
            const contacts = result.contacts || [];
            displayContacts(contacts);
        });
    }

    function displayContacts(contacts) {
        contactsList.innerHTML = '';
        
        if (contacts.length === 0) {
            contactsList.innerHTML = '<p style="color: #666; font-style: italic;">No saved contacts</p>';
            return;
        }

        contacts.forEach(contact => {
            const contactDiv = document.createElement('div');
            contactDiv.className = 'contact-item';
            contactDiv.innerHTML = `
                <div class="contact-name">${contact.firstName} ${contact.lastName}</div>
                <div class="contact-email">${contact.email}</div>
                <div class="contact-location">Location: ${contact.location}</div>
                ${contact.jobSearchTerm ? `<div class="contact-search-term">Search: ${contact.jobSearchTerm}</div>` : ''}
                <div class="contact-actions">
                    <button class="use-btn" data-contact-id="${contact.id}" data-action="use">Use</button>
                    <button class="delete-btn" data-contact-id="${contact.id}" data-action="delete">Delete</button>
                </div>
            `;
            contactsList.appendChild(contactDiv);
        });
    }

    function useContact(contactId) {
        chrome.storage.local.get(['contacts'], function(result) {
            const contacts = result.contacts || [];
            const contact = contacts.find(c => c.id === contactId);
            
            if (contact) {
                firstNameInput.value = contact.firstName;
                lastNameInput.value = contact.lastName;
                emailInput.value = contact.email;
                locationInput.value = contact.location;
                jobSearchTermInput.value = contact.jobSearchTerm || '';
                showStatus('Contact details loaded', 'success');
            }
        });
    }

    function deleteContact(contactId) {
        if (confirm('Are you sure you want to delete this contact?')) {
            chrome.storage.local.get(['contacts'], function(result) {
                const contacts = result.contacts || [];
                const filteredContacts = contacts.filter(c => c.id !== contactId);
                
                chrome.storage.local.set({ contacts: filteredContacts }, function() {
                    loadSavedContacts();
                    showStatus('Contact deleted', 'success');
                });
            });
        }
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            hideStatus();
        }, 3000);
    }

    function hideStatus() {
        statusDiv.style.display = 'none';
    }

    function autoReferAllMatchingJobs() {
        console.log('Auto-refer button clicked');
        
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const location = locationInput.value.trim().toUpperCase();
        const jobSearchTerm = jobSearchTermInput.value.trim();

        console.log('Form data:', { firstName, lastName, email, location, jobSearchTerm });

        if (!firstName || !lastName || !email || !location) {
            showStatus('Please fill in all required fields before auto-referring', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showStatus('Please enter a valid email address', 'error');
            return;
        }

        showStatus('Starting auto-referral process...', 'success');

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            console.log('Current tab:', tabs[0]);
            
            const referralData = {
                firstName,
                lastName,
                email,
                location,
                jobSearchTerm,
                action: 'autoReferMatchingJobs'
            };

            console.log('Sending message to content script:', referralData);

            chrome.tabs.sendMessage(tabs[0].id, referralData, function(response) {
                console.log('Response from content script:', response);
                console.log('Runtime error:', chrome.runtime.lastError);
                
                if (chrome.runtime.lastError) {
                    showStatus(`Error: ${chrome.runtime.lastError.message}. Please navigate to your employee portal job page.`, 'error');
                } else if (response && response.success) {
                    const message = response.message || `Auto-referred to ${response.referralCount} matching jobs!`;
                    showStatus(message, 'success');
                } else {
                    const errorMsg = response && response.error ? response.error : 'No matching jobs found or unable to process referrals';
                    showStatus(errorMsg, 'error');
                }
            });
        });
    }

    function loadAllJobsAndRefer() {
        console.log('Load all jobs button clicked');
        
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const location = locationInput.value.trim().toUpperCase();
        const jobSearchTerm = jobSearchTermInput.value.trim();

        console.log('Form data:', { firstName, lastName, email, location, jobSearchTerm });

        if (!firstName || !lastName || !email || !location) {
            showStatus('Please fill in all required fields before loading all jobs', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showStatus('Please enter a valid email address', 'error');
            return;
        }

        showStatus('Loading all available jobs, please wait...', 'success');

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            console.log('Current tab:', tabs[0]);
            
            const referralData = {
                firstName,
                lastName,
                email,
                location,
                jobSearchTerm,
                action: 'loadAllJobsAndRefer'
            };

            console.log('Sending message to load all jobs:', referralData);

            chrome.tabs.sendMessage(tabs[0].id, referralData, function(response) {
                console.log('Response from content script:', response);
                console.log('Runtime error:', chrome.runtime.lastError);
                
                if (chrome.runtime.lastError) {
                    showStatus(`Error: ${chrome.runtime.lastError.message}. Please navigate to your employee portal job page.`, 'error');
                } else if (response && response.success) {
                    const message = response.message || `Loaded all jobs and processed ${response.referralCount} referrals!`;
                    showStatus(message, 'success');
                } else {
                    const errorMsg = response && response.error ? response.error : 'Failed to load all jobs or process referrals';
                    showStatus(errorMsg, 'error');
                }
            });
        });
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
});