export const createPetPurchaseSmsText = ({ name, petNames }) =>
  `${name} عزیز، در آخرین سبد خرید شما پیش‌خرید حیوانات زیر پرداخت شده است:\n${petNames.join(
    '، ',
  )}\nبرای هماهنگی زمان بازدید با شما تماس گرفته خواهد شد.\nبا تشکر، پت‌شاپ پرشین\nلغو۱۱`;
