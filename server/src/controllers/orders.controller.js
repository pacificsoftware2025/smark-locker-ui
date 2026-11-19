import * as orderService from '../services/orderService.js';

// ==============================================================================
// CONTROLLER: Orders
// ==============================================================================

// POST /api/orders/dropoff
export async function handleDropoff(req, res, next) {
  try {
    const order = await orderService.createDropoffOrder(req.body);

    return res.status(201).json({
      success: true,
      message: 'Drop-off order created successfully.',
      data: {
        orderId: order.id,
        compartmentNumber: order.compartment_number,
        boxNumber: order.dropoff_box_number,
        stationId: order.station_id,
        customerName: order.customer_name,
        status: order.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/verify-pin
export async function handleVerifyPin(req, res, next) {
  try {
    const { pin } = req.body;
    const order = await orderService.verifyClaimPin(pin);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Invalid claim PIN or order is not ready for pickup.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Claim PIN verified successfully.',
      data: {
        orderId: order.id,
        assignedBox: order.pickup_box_number || order.compartment_number,
        customerName: order.customer_name,
        serviceTier: order.service_tier,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id
export async function handleGetOrder(req, res, next) {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
}
