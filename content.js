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
    } else if (request.action === 'loadAllJobsAndRefer') {
        console.log('Starting load all jobs and refer process');
        loadAllJobsAndRefer(request).then(result => {
            console.log('Load all jobs and refer completed:', result);
            sendResponse(result);
        }).catch(error => {
            console.error('Load all jobs and refer failed:', error);
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
        
        const allJobCards = document.querySelectorAll('.job-card');
        // Filter out invalid job cards (those without proper content)
        const validJobCards = Array.from(allJobCards).filter(card => {
            const titleElement = card.querySelector('.job-card_title');
            return titleElement && titleElement.textContent && titleElement.textContent.trim();
        });
        console.log(`Found ${validJobCards.length} valid job cards out of ${allJobCards.length} total cards`);
        let matchingJobs = [];
        
        // Find matching jobs
        for (const jobCard of validJobCards) {
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
        
        if (matchingJobs.length === 0) {
            return { success: true, referralCount: 0, message: 'No matching jobs found' };
        }
        
        let referralCount = 0;
        
        // Process referrals with delay to avoid overwhelming the system
        for (const job of matchingJobs) {
            try {
                console.log(`Processing referral for: ${job.jobTitle}`);
                
                // Click the refer button
                job.referButton.click();
                console.log('Clicked refer button, waiting for modal...');
                
                // Wait for modal to appear
                await waitForElement('.mat-mdc-dialog-surface', 5000);
                console.log('Modal appeared, filling form...');
                
                // Fill the referral form
                const modalResult = await fillReferralModal(data);
                
                if (modalResult === true) {
                    referralCount++;
                    console.log(`✅ Successfully referred to: ${job.jobTitle}`);
                    
                    // Make sure all dialogs are closed before proceeding to next job
                    await closeAnyOpenDialogs();
                    
                    // Wait before processing next job
                    await sleep(2000);
                } else if (modalResult === 'already_exists') {
                    console.log(`⚠️ Skipping ${job.jobTitle} - referral already exists for this email`);
                    
                    // Make sure all dialogs are closed before proceeding to next job
                    await closeAnyOpenDialogs();
                    
                    // Wait before processing next job
                    await sleep(1500);
                } else {
                    console.log(`❌ Failed to fill referral form for: ${job.jobTitle}`);
                    
                    // Close any open dialogs
                    await closeAnyOpenDialogs();
                    await sleep(1000);
                }
            } catch (error) {
                console.error(`Error processing job referral for ${job.jobTitle}:`, error);
                // Try to close any open dialogs
                await closeAnyOpenDialogs();
                await sleep(1000);
            }
        }
        
        const skippedCount = matchingJobs.length - referralCount;
        let message = `Successfully processed ${referralCount} referrals out of ${matchingJobs.length} matching jobs`;
        if (skippedCount > 0) {
            message += ` (${skippedCount} skipped - already referred)`;
        }
        
        return { success: true, referralCount: referralCount, message: message };
        
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
        console.log('Form submitted, waiting for response...');
        
        // Wait for either success dialog or error toast
        await sleep(1500); // Give time for response
        
        // Check for error toast first (referral already exists)
        const errorToast = document.querySelector('.toast-message_text');
        if (errorToast && errorToast.textContent.includes('already in progress')) {
            console.log('⚠️ Referral already exists for this email address');
            
            // Wait for toast to disappear, then close the modal
            await sleep(3000);
            await closeAnyOpenDialogs();
            return 'already_exists';
        }
        
        // Check for success dialog
        try {
            const successTitle = document.querySelector('.modal-title')?.textContent?.trim();
            console.log('Dialog title:', successTitle);
            
            if (successTitle && successTitle.includes('Thank you for your referral')) {
                console.log('✅ Referral submission confirmed');
                
                // Close the success dialog
                const closeButton = document.querySelector('.modal-body button[type="submit"], .modal-body .btn');
                if (closeButton) {
                    await sleep(1000); // Brief pause to see the success message
                    closeButton.click();
                    console.log('Closed success dialog');
                    await sleep(1000); // Wait for dialog to close
                }
                
                return true;
            }
        } catch (error) {
            console.log('No success dialog appeared');
        }
        
        // Check if there are still open dialogs to close
        await closeAnyOpenDialogs();
        
        // Fallback: assume success if no error was detected
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

async function closeAnyOpenDialogs() {
    // Try to close success dialog first
    const successCloseButton = document.querySelector('.modal-body button[type="submit"], .modal-body .btn');
    if (successCloseButton && successCloseButton.textContent.includes('Close')) {
        successCloseButton.click();
        console.log('Closed success dialog');
        await sleep(500);
    }
    
    // Try to close referral dialog (X button)
    const referralCloseButton = document.querySelector('.modal-close app-icon[name="close"]');
    if (referralCloseButton) {
        referralCloseButton.click();
        console.log('Closed referral dialog');
        await sleep(500);
    }
    
    // Try to close referral dialog (click on X icon parent)
    const referralCloseParent = document.querySelector('.modal-close');
    if (referralCloseParent) {
        referralCloseParent.click();
        console.log('Closed referral dialog (parent)');
        await sleep(500);
    }
    
    // Generic dialog close attempts
    const genericCloseButtons = document.querySelectorAll('.mat-mdc-dialog-container .close, .mat-mdc-dialog-container [aria-label="close"]');
    for (const button of genericCloseButtons) {
        if (button.offsetParent !== null) { // Check if visible
            button.click();
            console.log('Closed generic dialog');
            await sleep(500);
        }
    }
    
    // Wait for toast to disappear naturally (they usually auto-hide)
    const toastContainer = document.querySelector('.toast-container');
    if (toastContainer && toastContainer.children.length > 0) {
        console.log('Waiting for toast notification to disappear...');
        await sleep(2000);
    }
}

async function loadAllJobsAndRefer(data) {
    try {
        console.log('Starting batch processing: scroll and refer approach');
        
        const scrollContainer = document.getElementById('scrolling-container');
        if (!scrollContainer) {
            console.log('Scroll container not found');
            return { success: false, error: 'Scroll container not found. Make sure you are on the jobs page.' };
        }
        
        let totalReferrals = 0;
        let batchNumber = 1;
        const maxBatches = 20; // Prevent infinite processing
        let consecutiveEmptyBatches = 0;
        
        // Process jobs in batches as we scroll
        while (batchNumber <= maxBatches) {
            console.log(`\n--- Batch ${batchNumber} ---`);
            
            // Process currently visible jobs
            const batchResult = await autoReferMatchingJobs(data);
            
            if (batchResult.success && batchResult.referralCount > 0) {
                totalReferrals += batchResult.referralCount;
                consecutiveEmptyBatches = 0;
                console.log(`Batch ${batchNumber} completed: ${batchResult.referralCount} referrals. Total so far: ${totalReferrals}`);
            } else {
                consecutiveEmptyBatches++;
                console.log(`Batch ${batchNumber}: No referrals processed`);
                
                // If we've had several batches with no referrals, we might be done
                if (consecutiveEmptyBatches >= 3) {
                    console.log('Multiple batches with no referrals, might have processed all matching jobs');
                    break;
                }
            }
            
            // Scroll down to load more jobs
            console.log('Scrolling down to load more jobs...');
            const initialJobCount = document.querySelectorAll('.job-card').length;
            
            // Scroll to bottom
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
            
            // Wait for new jobs to load
            await sleep(3000);
            
            // Check if spinner is visible
            const spinner = document.querySelector('.collection_spinner, .layout_spinner');
            if (spinner && spinner.offsetParent !== null) {
                console.log('Spinner visible, waiting longer for content...');
                await sleep(3000);
            }
            
            const newJobCount = document.querySelectorAll('.job-card').length;
            const newJobsLoaded = newJobCount - initialJobCount;
            
            console.log(`Loaded ${newJobsLoaded} new jobs (${initialJobCount} -> ${newJobCount})`);
            
            // If no new jobs loaded for several attempts, we've reached the end
            if (newJobsLoaded === 0) {
                consecutiveEmptyBatches++;
                if (consecutiveEmptyBatches >= 2) {
                    console.log('No new jobs loading, reached end of job list');
                    break;
                }
            } else {
                consecutiveEmptyBatches = 0;
            }
            
            // Check for too many errors (malformed job data)
            const validJobs = Array.from(document.querySelectorAll('.job-card')).filter(card => {
                const titleElement = card.querySelector('.job-card_title');
                return titleElement && titleElement.textContent && titleElement.textContent.trim();
            }).length;
            
            if (newJobCount > validJobs + 10) { // Too many empty cards
                console.log('Detected too many malformed job cards, stopping batch processing');
                break;
            }
            
            batchNumber++;
        }
        
        const message = totalReferrals > 0 
            ? `Batch processing completed! Successfully processed ${totalReferrals} referrals across ${batchNumber - 1} batches.`
            : `Batch processing completed. No matching jobs found across ${batchNumber - 1} batches.`;
            
        return { success: true, referralCount: totalReferrals, message: message };
        
    } catch (error) {
        console.error('Error in batch processing:', error);
        return { success: false, error: error.message };
    }
}

async function loadAllJobsWithScroll() {
    const scrollContainer = document.getElementById('scrolling-container');
    const maxScrolls = 50; // Prevent infinite loop
    let scrollCount = 0;
    let lastJobCount = 0;
    let consecutiveEmptyScrolls = 0;
    
    while (scrollCount < maxScrolls) {
        // Count current jobs (excluding empty job cards)
        const currentJobCards = document.querySelectorAll('.job-card');
        const validJobCards = Array.from(currentJobCards).filter(card => {
            // Check if job card has actual content (title element)
            const titleElement = card.querySelector('.job-card_title');
            return titleElement && titleElement.textContent.trim();
        });
        const currentJobCount = validJobCards.length;
        
        console.log(`Scroll ${scrollCount + 1}: Found ${currentJobCount} valid jobs (${currentJobCards.length} total cards)`);
        
        // If no new valid jobs loaded, increment counter
        if (currentJobCount === lastJobCount) {
            consecutiveEmptyScrolls++;
            if (consecutiveEmptyScrolls >= 3) {
                console.log('No new valid jobs loaded for 3 consecutive scrolls, assuming we reached the end');
                break;
            }
        } else {
            consecutiveEmptyScrolls = 0; // Reset counter if we found new jobs
        }
        
        // Check for Angular errors in console that indicate malformed data
        const hasErrors = document.querySelectorAll('.job-card').length > currentJobCount + 5; // Too many empty cards
        if (hasErrors && scrollCount > 10) {
            console.log('Detected too many empty job cards, likely due to data errors. Stopping scroll.');
            break;
        }
        
        lastJobCount = currentJobCount;
        
        // Scroll to the bottom of the container
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        
        // Wait for new jobs to load
        await sleep(2000);
        
        // Check if spinner is visible (indicating more content is loading)
        const spinner = document.querySelector('.collection_spinner, .layout_spinner');
        if (spinner && spinner.offsetParent !== null) {
            console.log('Spinner visible, waiting for content to load...');
            await sleep(3000); // Wait longer when spinner is active
        }
        
        scrollCount++;
        
        // Check if we've loaded a substantial amount
        if (currentJobCount >= 1000) { // Reasonable limit
            console.log('Loaded substantial number of jobs, stopping to prevent timeout');
            break;
        }
    }
    
    const finalJobCards = document.querySelectorAll('.job-card');
    const validFinalJobCards = Array.from(finalJobCards).filter(card => {
        const titleElement = card.querySelector('.job-card_title');
        return titleElement && titleElement.textContent.trim();
    });
    console.log(`Finished loading jobs. Total valid jobs loaded: ${validFinalJobCards.length} (${finalJobCards.length} total cards)`);
}

if (detectJobReferralPage()) {
    console.log('Job Referral Extension - Detected job/referral page');
}