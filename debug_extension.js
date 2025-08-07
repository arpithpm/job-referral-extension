// Test if the extension content script is loaded
console.log('=== Extension Debug Test ===');

// Check if content script is injected
if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('✅ Chrome extension API is available');
    console.log('Extension ID:', chrome.runtime.id);
} else {
    console.log('❌ Chrome extension API is NOT available');
}

// Test the message listener
console.log('Testing message listener...');

// Simulate the message that would be sent from popup
const testMessage = {
    firstName: 'John',
    lastName: 'Doe', 
    email: 'john@example.com',
    location: 'DE',
    jobSearchTerm: 'Java OR Developer OR Python',
    action: 'autoReferMatchingJobs'
};

console.log('Test message:', testMessage);

// Try to trigger the message listener directly
if (window.chrome && window.chrome.runtime && window.chrome.runtime.onMessage) {
    console.log('Message listener exists');
    
    // Check if our content script functions exist
    if (typeof autoReferMatchingJobs === 'function') {
        console.log('✅ autoReferMatchingJobs function exists');
        
        // Test it directly
        autoReferMatchingJobs(testMessage).then(result => {
            console.log('✅ Direct function call result:', result);
        }).catch(error => {
            console.log('❌ Direct function call error:', error);
        });
        
    } else {
        console.log('❌ autoReferMatchingJobs function does NOT exist');
        console.log('Available functions:', Object.getOwnPropertyNames(window).filter(name => typeof window[name] === 'function'));
    }
} else {
    console.log('❌ Message listener does NOT exist');
}