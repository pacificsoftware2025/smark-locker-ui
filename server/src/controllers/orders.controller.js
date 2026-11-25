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

    const billedAmount = order.amount ? parseFloat(order.amount) : 180.00;
    const weightKg = order.weight_kg ? parseFloat(order.weight_kg) : 4.5;
    const isPaid = Boolean(order.is_paid);

    return res.status(200).json({
      success: true,
      message: 'Claim PIN verified successfully.',
      data: {
        orderId: order.id,
        assignedBox: order.pickup_box_number || order.compartment_number,
        customerName: order.customer_name,
        serviceTier: order.service_tier,
        weightKg: weightKg,
        amount: billedAmount,
        isPaid: isPaid,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=00020101021226600016PH.GCASH.MERCHANT0114SMARTLOCKER0208${order.id}520459995303608540${billedAmount.toFixed(2)}5802PH5912SMARTLOCKER6006MANILA6304`,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/:id/confirm-payment
export async function handleConfirmPayment(req, res, next) {
  try {
    const { id } = req.params;
    const { paymentMethod, reference } = req.body;
    const order = await orderService.confirmOrderPayment(id, paymentMethod, reference);

    return res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully. Locker unlocked.',
      data: {
        orderId: order.id,
        assignedBox: order.pickup_box_number || order.compartment_number,
        isPaid: true,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/analytics/payments (KPIs & Financial charts for Operator Dashboard)
export async function handleGetPaymentAnalytics(req, res, next) {
  try {
    const { stationId } = req.query;
    const analytics = await orderService.getPaymentAnalytics(stationId);

    return res.status(200).json({
      success: true,
      data: analytics,
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

// GET /api/orders
export async function handleListOrders(req, res, next) {
  try {
    const { status, operatorId, operator_id } = req.query;
    const opId = operatorId || operator_id || null;
    const orders = await orderService.listOrders(status, opId);

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/:id/collect (Rider collects dirty laundry from locker)
export async function handleDriverCollect(req, res, next) {
  try {
    const { id } = req.params;
    const order = await orderService.collectOrderByDriver(id);

    return res.status(200).json({
      success: true,
      message: `Order ${id} collected by driver. Compartment is now available.`,
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/:id/intake (Facility operator updates weight & price)
export async function handleOrderIntake(req, res, next) {
  try {
    const { id } = req.params;
    const { weightKg, amount } = req.body;
    const order = await orderService.updateOrderIntake(id, weightKg, amount);

    return res.status(200).json({
      success: true,
      message: `Order ${id} intake completed. Moved to In Wash.`,
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/:id/deliver (Driver delivers clean laundry back to locker)
export async function handleDriverDeliver(req, res, next) {
  try {
    const { id } = req.params;
    const { stationId, boxNumber } = req.body;
    const order = await orderService.deliverCleanOrder(id, stationId || 'CMH-01', boxNumber);

    return res.status(200).json({
      success: true,
      message: `Order ${id} placed in Box ${boxNumber}. Ready for customer pickup.`,
      data: {
        orderId: order.id,
        pickupBoxNumber: order.pickup_box_number,
        claimPin: order.claim_pin,
        status: order.status,
      },
    });
  } catch (err) {
    next(err);
  }
}
