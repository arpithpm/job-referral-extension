// Test script to run in browser console to debug job matching
console.log("=== Job Referral Extension Debug ===");

const jobCards = document.querySelectorAll(".job-card");
console.log(`Found ${jobCards.length} job cards on page`);

jobCards.forEach((jobCard, index) => {
  const jobTitle = jobCard
    .querySelector(".job-card_title")
    ?.textContent?.trim();
  const locationElement = jobCard.querySelector(".job-card_location");
  const locationText = locationElement?.textContent?.trim();
  const referButton = jobCard.querySelector("app-job-refer-button button");

  console.log(`Job ${index + 1}:`);
  console.log(`  Title: ${jobTitle}`);
  console.log(`  Location Text: ${locationText}`);

  if (locationText) {
    const locationMatch = locationText.match(/- ([A-Z]{2})$/);
    const jobLocation = locationMatch ? locationMatch[1] : "";
    console.log(`  Extracted Location: ${jobLocation}`);
  }

  console.log(`  Has Refer Button: ${!!referButton}`);
  console.log(`  Refer Button Disabled: ${referButton?.disabled}`);
  console.log("---");
});

// Test with sample data
const testLocation = "DE"; // Germany
const testSearchTerm = "Java OR Developer OR Python";

console.log(
  `\nTesting matches for location: ${testLocation} and search term: ${testSearchTerm}`
);

let matchingJobs = [];
jobCards.forEach((jobCard, index) => {
  const jobTitle = jobCard
    .querySelector(".job-card_title")
    ?.textContent?.trim();
  const locationElement = jobCard.querySelector(".job-card_location");
  const locationText = locationElement?.textContent?.trim();

  if (!jobTitle || !locationText) return;

  // Extract country code from location
  const locationMatch = locationText.match(/- ([A-Z]{2})$/);
  const jobLocation = locationMatch ? locationMatch[1] : "";

  // Check if location matches
  const locationMatches = jobLocation === testLocation;

  // Check if job title matches search terms
  let jobTitleMatches = true;
  if (testSearchTerm) {
    const searchTerms = testSearchTerm.split(/\s+OR\s+|\s*\|\s*|,\s*/i);
    jobTitleMatches = searchTerms.some((term) =>
      jobTitle.toLowerCase().includes(term.trim().toLowerCase())
    );
  }

  if (locationMatches && jobTitleMatches) {
    const referButton = jobCard.querySelector("app-job-refer-button button");
    if (referButton && !referButton.disabled) {
      matchingJobs.push({
        index: index + 1,
        title: jobTitle,
        location: jobLocation,
        hasButton: !!referButton,
      });
    }
  }
});

console.log(`\nFound ${matchingJobs.length} matching jobs:`);
matchingJobs.forEach((job) => {
  console.log(`  ${job.index}. ${job.title} (${job.location})`);
});
