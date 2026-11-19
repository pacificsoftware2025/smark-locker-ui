// ==============================================================================
// MIDDLEWARE: Payload Validation
// ==============================================================================

export function validateDropoffPayload(req, res, next) {
  const { customerName, contactNumber, stationId, serviceTier, serviceSize } = req.body;

  if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Invalid customerName. Must be at least 2 characters.',
    });
  }

  if (!contactNumber || typeof contactNumber !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Invalid contactNumber. Required.',
    });
  }

  // Check valid Philippine mobile pattern (+639xxxxxxxxx or 09xxxxxxxxx or 9xxxxxxxxx)
  const cleanPhone = contactNumber.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Invalid Philippine phone number. Must contain at least 10 digits.',
    });
  }

  if (!stationId) {
    return res.status(400).json({
      success: false,
      message: 'Missing stationId.',
    });
  }

  if (!serviceTier || !serviceSize) {
    return res.status(400).json({
      success: false,
      message: 'Missing serviceTier or serviceSize.',
    });
  }

  next();
}

export function validatePinPayload(req, res, next) {
  const { pin } = req.body;

  if (!pin || typeof pin !== 'string' || pin.trim().length < 4) {
    return res.status(400).json({
      success: false,
      message: 'Invalid PIN. Must be 4 to 6 digits.',
    });
  }

  next();
}
