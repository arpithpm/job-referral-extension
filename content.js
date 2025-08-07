console.log('Job Referral Extension - Content script loaded');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Content script received message:', request);
    
    if (request.action === 'fillReferralForm') {
        const success = fillReferralForm(request);
        sendResponse({success: success});
    } else if (request.action === 'autoReferMatchingJobs') {
        console.log('Starting auto-refer process in content script');
        autoReferMatchingJobs(request).then(result => {
            console.log('Auto-refer process completed:', result);
            sendResponse(result);
        }).catch(error => {
            console.error('Auto-refer process failed:', error);
            sendResponse({success: false, error: error.message});
        });
        return true; // Keep message channel open for async response
    }
});

function fillReferralForm(data) {
    try {
        const filled = {
            firstName: false,
            lastName: false,
            email: false,
            location: false,
            jobSearchTerm: false
        };

        const firstNameSelectors = [
            'input[name*="first" i][name*="name" i]',
            'input[id*="first" i][id*="name" i]',
            'input[placeholder*="first" i][placeholder*="name" i]',
            'input[name="firstName"]',
            'input[id="firstName"]',
            'input[name="first_name"]',
            'input[id="first_name"]'
        ];

        const lastNameSelectors = [
            'input[name*="last" i][name*="name" i]',
            'input[id*="last" i][id*="name" i]',
            'input[placeholder*="last" i][placeholder*="name" i]',
            'input[name="lastName"]',
            'input[id="lastName"]',
            'input[name="last_name"]',
            'input[id="last_name"]'
        ];

        const emailSelectors = [
            'input[type="email"]',
            'input[name*="email" i]',
            'input[id*="email" i]',
            'input[placeholder*="email" i]'
        ];

        const locationSelectors = [
            'input[name*="location" i]',
            'input[id*="location" i]',
            'input[placeholder*="location" i]',
            'input[name*="country" i]',
            'input[id*="country" i]',
            'input[placeholder*="country" i]',
            'select[name*="location" i]',
            'select[id*="location" i]',
            'select[name*="country" i]',
            'select[id*="country" i]'
        ];

        const jobSearchTermSelectors = [
            'input[name*="skill" i]',
            'input[id*="skill" i]',
            'input[placeholder*="skill" i]',
            'input[name*="keyword" i]',
            'input[id*="keyword" i]',
            'input[placeholder*="keyword" i]',
            'input[name*="search" i]',
            'input[id*="search" i]',
            'input[placeholder*="search" i]',
            'input[name*="technology" i]',
            'input[id*="technology" i]',
            'input[placeholder*="technology" i]',
            'textarea[name*="skill" i]',
            'textarea[id*="skill" i]',
            'textarea[placeholder*="skill" i]',
            'textarea[name*="keyword" i]',
            'textarea[id*="keyword" i]',
            'textarea[placeholder*="keyword" i]'
        ];

        filled.firstName = fillField(firstNameSelectors, data.firstName);
        filled.lastName = fillField(lastNameSelectors, data.lastName);
        filled.email = fillField(emailSelectors, data.email);
        filled.location = fillLocationField(locationSelectors, data.location);
        
        if (data.jobSearchTerm) {
            filled.jobSearchTerm = fillField(jobSearchTermSelectors, data.jobSearchTerm);
        }

        const filledCount = Object.values(filled).filter(Boolean).length;
        
        console.log('Job Referral Extension - Fields filled:', filled);
        
        return filledCount > 0;
        
    } catch (error) {
        console.error('Job Referral Extension - Error filling form:', error);
        return false;
    }
}

function fillField(selectors, value) {
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
            if (element && element.offsetParent !== null && !element.disabled && !element.readOnly) {
                if (element.value === '' || confirm(`Replace existing value "${element.value}" with "${value}"?`)) {
                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.dispatchEvent(new Event('blur', { bubbles: true }));
                    
                    console.log(`Filled field with selector "${selector}":`, value);
                    return true;
                }
            }
        }
    }
    return false;
}

function fillLocationField(selectors, value) {
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
            if (element && element.offsetParent !== null && !element.disabled && !element.readOnly) {
                if (element.tagName.toLowerCase() === 'select') {
                    const option = Array.from(element.options).find(opt => 
                        opt.value.toLowerCase().includes(value.toLowerCase()) ||
                        opt.text.toLowerCase().includes(value.toLowerCase()) ||
                        opt.value === value
                    );
                    
                    if (option) {
                        element.value = option.value;
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log(`Selected option in dropdown with selector "${selector}":`, option.value);
                        return true;
                    }
                } else {
                    if (element.value === '' || confirm(`Replace existing value "${element.value}" with "${value}"?`)) {
                        element.value = value;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        element.dispatchEvent(new Event('blur', { bubbles: true }));
                        
                        console.log(`Filled location field with selector "${selector}":`, value);
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function detectJobReferralPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const bodyText = document.body.textContent.toLowerCase();
    
    const jobKeywords = ['job', 'position', 'role', 'career', 'opening', 'vacancy'];
    const referralKeywords = ['refer', 'referral', 'recommend', 'nominate'];
    
    const hasJobKeyword = jobKeywords.some(keyword => 
        url.includes(keyword) || title.includes(keyword) || bodyText.includes(keyword)
    );
    
    const hasReferralKeyword = referralKeywords.some(keyword => 
        url.includes(keyword) || title.includes(keyword) || bodyText.includes(keyword)
    );
    
    return hasJobKeyword || hasReferralKeyword;
}

async function autoReferMatchingJobs(data) {
    try {
        console.log('Job Referral Extension - Starting auto-referral process');
        console.log('Search data:', data);
        
        const jobCards = document.querySelectorAll('.job-card');
        console.log(`Found ${jobCards.length} job cards on page`);
        let referralCount = 0;
        let matchingJobs = [];
        
        // Find matching jobs
        for (const jobCard of jobCards) {
            const jobTitle = jobCard.querySelector('.job-card_title')?.textContent?.trim();
            const locationElement = jobCard.querySelector('.job-card_location');
            const locationText = locationElement?.textContent?.trim();
            
            if (!jobTitle || !locationText) continue;
            
            // Extract country code from location (e.g., "Budapest - HU" -> "HU")
            const locationMatch = locationText.match(/- ([A-Z]{2})$/);
            const jobLocation = locationMatch ? locationMatch[1] : '';
            
            // Check if location matches
            const locationMatches = jobLocation === data.location;
            
            // Check if job title matches search terms (if provided)
            let jobTitleMatches = true;
            if (data.jobSearchTerm) {
                const searchTerms = data.jobSearchTerm.split(/\s+OR\s+|\s*\|\s*|,\s*/i);
                jobTitleMatches = searchTerms.some(term => 
                    jobTitle.toLowerCase().includes(term.trim().toLowerCase())
                );
            }
            
            if (locationMatches && jobTitleMatches) {
                const referButton = jobCard.querySelector('app-job-refer-button button');
                if (referButton && !referButton.disabled) {
                    matchingJobs.push({ jobCard, jobTitle, referButton });
                }
            }
        }
        
        console.log(`Found ${matchingJobs.length} matching jobs`);
        
        // For debugging: just return the matching jobs without actually processing referrals
        matchingJobs.forEach((job, index) => {
            console.log(`Matching job ${index + 1}: ${job.jobTitle}`);
        });
        
        return { 
            success: true, 
            referralCount: matchingJobs.length,
            message: `Found ${matchingJobs.length} matching jobs (debug mode - not actually processing referrals yet)`
        };
        
    } catch (error) {
        console.error('Job Referral Extension - Error in auto-referral:', error);
        return { success: false, referralCount: 0 };
    }
}

async function fillReferralModal(data) {
    try {
        // Wait a bit for the form to load
        await sleep(1000);
        
        const firstNameField = document.querySelector('input[name="firstName"], input[id="firstName"]');
        const lastNameField = document.querySelector('input[name="lastName"], input[id="lastName"]');
        const emailField = document.querySelector('input[name="email"], input[id="email"]');
        const termsCheckbox = document.querySelector('mat-checkbox[formcontrolname="acceptedTerms"] input[type="checkbox"]');
        const submitButton = document.querySelector('button[type="submit"]');
        
        if (!firstNameField || !lastNameField || !emailField || !termsCheckbox || !submitButton) {
            console.log('Could not find all required form fields');
            return false;
        }
        
        // Fill the form fields
        firstNameField.value = data.firstName;
        firstNameField.dispatchEvent(new Event('input', { bubbles: true }));
        firstNameField.dispatchEvent(new Event('change', { bubbles: true }));
        
        lastNameField.value = data.lastName;
        lastNameField.dispatchEvent(new Event('input', { bubbles: true }));
        lastNameField.dispatchEvent(new Event('change', { bubbles: true }));
        
        emailField.value = data.email;
        emailField.dispatchEvent(new Event('input', { bubbles: true }));
        emailField.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Check the terms checkbox
        if (!termsCheckbox.checked) {
            termsCheckbox.click();
        }
        
        // Wait a moment for form validation
        await sleep(500);
        
        // Submit the form
        submitButton.click();
        
        // Wait for submission to complete
        await sleep(2000);
        
        return true;
        
    } catch (error) {
        console.error('Error filling referral modal:', error);
        return false;
    }
}

function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }
        
        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                obs.disconnect();
                resolve(element);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        setTimeout(() => {
            observer.disconnect();
            reject(new Error('Element not found within timeout'));
        }, timeout);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

if (detectJobReferralPage()) {
    console.log('Job Referral Extension - Detected job/referral page');
}