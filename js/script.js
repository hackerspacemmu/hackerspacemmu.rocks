const daysActiveEl = document.getElementById('days-active');
const activeMembersEl = document.getElementById('active-members');
const meetupsEl = document.getElementById('meetups');
const projectUpdatesEl = document.getElementById('project-updates');

!(function ($) {
  // Append floating window to body
  $(function () {
    $.get('/components/FloatingModal/floating-modal.html', function (data) {
      $('body').append(data);
    });
  });
})(jQuery);

async function getMeetups() {
  try {
    const response = await $.ajax({
      url: `${CONFIG.API_BASE_URL}/api/v1/meetups/count`,
      type: 'GET',
    });
    const meetups = response.total;
    return meetups;
  } catch (error) {
    console.error(error);
    return '500+';
  }
}

async function getProjectUpdates() {
  try {
    const response = await $.ajax({
      url: `${CONFIG.API_BASE_URL}/api/v1/updates/count`,
      type: 'GET',
    });

    const projectUpdates = response.total;
    return projectUpdates;
  } catch (error) {
    console.error(error);
    return '1500+';
  }
}

function getDaysActive() {
  const currentDate = new Date();
  const creationDate = new Date('2011-06-09');

  const timeDifference = currentDate - creationDate; // in ms
  const daysActive = Math.ceil(timeDifference / (24 * 60 * 60 * 1000)); // convert ms into days

  return daysActive;
}

async function getActiveMembers() {
  try {
    const response = await $.ajax({
      url: `${CONFIG.API_BASE_URL}/api/v1/members/count`,
      type: 'GET',
    });
    const activeMembers = response.total;
    return activeMembers;
  } catch (error) {
    console.error('error');
    return '50+';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const meetups = await getMeetups();
  meetupsEl.textContent = meetups;

  const daysActive = getDaysActive();
  daysActiveEl.textContent = daysActive;

  const projectUpdates = await getProjectUpdates();
  projectUpdatesEl.textContent = projectUpdates;

  const activeMembers = await getActiveMembers();
  activeMembersEl.textContent = activeMembers;
});
