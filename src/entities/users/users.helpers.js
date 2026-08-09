export const formatUserFullName = (
  user,
  firstNameKey = 'firstName',
  lastNameKey = 'lastName',
) => {
  const firstName = user?.[firstNameKey];
  const lastName = user?.[lastNameKey];

  return firstName || lastName
    ? `${firstName}${lastName ? ` ${lastName}` : ''}`
    : 'کاربر';
};
