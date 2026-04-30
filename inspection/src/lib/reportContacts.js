export function getBusinessEmail(business) {
  return business?.contact_person_email || business?.owner_email || business?.contact_email || '—';
}

export function getBusinessPhone(business) {
  return business?.contact_person_phone || business?.owner_phone || business?.contact_phone || '—';
}

export function getBusinessContactName(business) {
  return business?.contact_person_name || business?.owner_name || business?.business_name || 'Owner';
}
