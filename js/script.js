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
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const meetups = await getMeetups();
  meetupsEl.textContent = meetups;
});
