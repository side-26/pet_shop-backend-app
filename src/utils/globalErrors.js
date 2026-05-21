import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/index.js';

export const returnFormValidation = (validationSchema, body, res) => {
  const result = validationSchema.safeParse(body);
  console.log(result.success, 'result');
  if (!result.success) {
    console.log(result?.error?.issues);
    // Build the array of field errors
    const fieldErrors = JSON.parse(result?.error?.message)?.map(
      ({ path, message }) => ({
        field: path?.[0],
        value: message,
      }),
    );
    console.log(fieldErrors, 'fieldErrors');

    setErrorResponse(res, STATUES.BAD_FORM_VALIDATION, {
      message: 'اطلاعات وارد شده معتبر نیست', // global message
      data: {
        messages: fieldErrors,
        detail: {}, // extra data if needed
      },
    });
    return;
  }
  const validatedData = result.data;
  return validatedData;
};
