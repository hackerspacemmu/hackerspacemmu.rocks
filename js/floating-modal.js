!(function ($) {
  var formLink = '';

  function isEmail(email) {
    const targetDomain = 'mmu.edu.my';
    var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    const validDomain = email.includes(targetDomain);
    return regex.test(email) && validDomain;
  }

  function hideFormErrorMessage() {
    $('.register-form-error-message').removeClass(
      'register-form-error-message-visible',
    );
  }

  function showFormErrorMessage() {
    $('.register-form-error-message').addClass(
      'register-form-error-message-visible',
    );
  }

  function hideFloatingModal() {
    $('.floating-modal').removeClass('floating-modal-visible fadeInUp');
  }

  function showFloatingModal() {
    $('.floating-modal').addClass('floating-modal-visible fadeInUp');
  }

  $('.floating-modal-close-button').on('click', function () {
    hideFloatingModal();
  });

  $('.floating-modal-open-button').on('click', function () {
    showFloatingModal();
  });

  $('.register-form-email-input').keyup(function () {
    if (isEmail(this.value)) {
      hideFormErrorMessage();
    } else {
      showFormErrorMessage();
    }
  });

  $('.register-form-submit-button').on('click', function () {
    console.log('submit');
  });

  var once = false;
  //detecting scroll events
  $(window).scroll(function (event) {
    var windowHeight = $(window).scrollTop();
    if (!once) {
      if (windowHeight > 100) {
        showFloatingModal();
        once = true;
      }
    }
  });
})(jQuery);
