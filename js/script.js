!(function ($) {
  // Append floating window to body
  $(function () {
    $.get('/components/FloatingModal/floating-modal.html', function (data) {
      $('body').append(data);
    });
  });
})(jQuery);
