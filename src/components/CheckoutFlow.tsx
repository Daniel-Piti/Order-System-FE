import { useState, useEffect } from 'react';
import { publicAPI, Location, ProductDataForOrder } from '../services/api';

interface CheckoutFlowProps {
  orderId: string;
  userId: string;
  cart: Array<{ product: { id: string; name: string; specialPrice: number }; quantity: number }>;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'customer-info' | 'pickup-location' | 'review' | 'success';

export default function CheckoutFlow({ orderId, userId, cart, onClose, onSuccess }: CheckoutFlowProps) {
  const [step, setStep] = useState<Step>('customer-info');
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');

  // Customer info form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerStreetAddress, setCustomerStreetAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');

  // Pickup location
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  // Order details
  const [notes, setNotes] = useState('');

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const data = await publicAPI.locations.getAllByUserId(userId);
        setLocations(data);
        if (data.length === 1) {
          setSelectedLocationId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err);
        setError('Failed to load pickup locations');
      } finally {
        setIsLoadingLocations(false);
      }
    };
    fetchLocations();
  }, [userId]);

  const validateStep1 = (): boolean => {
    if (!customerName.trim()) {
      setError('Customer name is required');
      return false;
    }
    if (!customerPhone.trim()) {
      setError('Customer phone is required');
      return false;
    }
    if (!customerStreetAddress.trim()) {
      setError('Street address is required');
      return false;
    }
    if (!customerCity.trim()) {
      setError('City is required');
      return false;
    }
    setError('');
    return true;
  };

  const validateStep2 = (): boolean => {
    if (selectedLocationId === null) {
      setError('Please select a pickup location');
      return false;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (step === 'customer-info') {
      if (validateStep1()) {
        setStepDirection('forward');
        setStep('pickup-location');
      }
    } else if (step === 'pickup-location') {
      if (validateStep2()) {
        setStepDirection('forward');
        setStep('review');
      }
    }
  };

  const handleBack = () => {
    if (step === 'pickup-location') {
      setStepDirection('backward');
      setStep('customer-info');
    } else if (step === 'review') {
      setStepDirection('backward');
      setStep('pickup-location');
    }
  };

  const handleSubmit = async () => {
    if (!selectedLocationId) {
      setError('Please select a pickup location');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const products: ProductDataForOrder[] = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        pricePerUnit: item.product.specialPrice,
      }));

      await publicAPI.orders.placeOrder(orderId, {
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        customerStreetAddress,
        customerCity,
        pickupLocationId: selectedLocationId,
        products,
        notes: notes || undefined,
      });

      setStep('success');
      // Clear cart but keep success screen visible
      onSuccess();
    } catch (err: any) {
      console.error('Failed to place order:', err);
      setError(err.response?.data?.userMessage || err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.product.specialPrice * item.quantity), 0);

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="backdrop-blur-xl bg-white/95 rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center shadow-2xl border border-white/40">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Order Placed!</h1>
          <p className="text-lg text-gray-600">
            Thank you for your order. We have received your order and will process it shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="backdrop-blur-xl bg-white/95 rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/40">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Checkout</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-3xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8 px-4">
          <div className="flex w-[70%] items-start">
            {[
              { key: 'customer-info', label: 'Info', step: 1 },
              { key: 'pickup-location', label: 'Location', step: 2 },
              { key: 'review', label: 'Review', step: 3 },
            ].map(({ key, label, step: stepNum }, index, array) => {
              const isActive = step === key;
              const isCompleted = 
                (step === 'pickup-location' && stepNum < 2) ||
                (step === 'review' && stepNum < 3);
              
              // Determine line color based on current step
              let lineColor = 'bg-gray-500';
              if (step === 'customer-info') {
                lineColor = 'bg-gray-500';
              } else if (step === 'pickup-location') {
                if (stepNum === 1) {
                  lineColor = 'bg-green-500';
                } else if (stepNum === 2) {
                  lineColor = 'bg-gray-500';
                }
              } else if (step === 'review') {
                lineColor = 'bg-green-500';
              }
              
              return (
                <div key={key} className="flex-1 flex flex-col items-center relative">
                  {/* Circle */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all shadow-lg border-2 backdrop-blur-sm relative z-10 ${
                      isActive
                        ? 'bg-purple-600 text-white border-purple-400 shadow-purple-500/50'
                        : isCompleted
                        ? 'bg-green-500/90 text-white border-green-400 shadow-green-500/50'
                        : 'bg-white/80 text-gray-600 border-gray-300 shadow-gray-300/50'
                    }`}
                  >
                    {isCompleted ? '✓' : stepNum}
                  </div>
                  
                  {/* Label under circle */}
                  <span className={`mt-2 text-sm font-semibold ${isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-600'}`}>
                    {label}
                  </span>
                  
                  {/* Connecting line to next step */}
                  {index < array.length - 1 && (
                    <>
                      {/* Line positioned absolutely between circles */}
                      <div 
                        className={`absolute h-1 rounded-full ${lineColor}`}
                        style={{
                          top: '1.5rem', // Center of circle
                          left: 'calc(50% + 1.5rem + 0.5rem)', // Start after right edge of circle + padding
                          width: 'calc(100% - 3rem - 1rem)', // Span to next circle minus circle width and padding on both sides
                          transform: 'translateY(-50%)',
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl">
            {error}
          </div>
        )}

        {/* Step 1: Customer Info */}
        {step === 'customer-info' && (
          <div className={`space-y-4 ${
            stepDirection === 'forward' ? 'animate-fade-in-left' : 'animate-fade-in-right'
          }`}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Customer Information</h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Street Address *</label>
              <input
                type="text"
                value={customerStreetAddress}
                onChange={(e) => setCustomerStreetAddress(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
                placeholder="Enter your street address"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
              <input
                type="text"
                value={customerCity}
                onChange={(e) => setCustomerCity(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none"
                placeholder="Enter your city"
              />
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl hover:bg-purple-700 hover:shadow-2xl hover:scale-105 transition-all duration-200 border-2 border-purple-400/50 backdrop-blur-sm shadow-lg shadow-purple-500/30"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Pickup Location */}
        {step === 'pickup-location' && (
          <div className={`space-y-4 ${
            stepDirection === 'forward' ? 'animate-fade-in-left' : 'animate-fade-in-right'
          }`}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Select Pickup Location</h3>
            
            {isLoadingLocations ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600 mx-auto"></div>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                No pickup locations available
              </div>
            ) : (
              <div className="space-y-3">
                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => setSelectedLocationId(location.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedLocationId === location.id
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-800 mb-1">{location.name}</div>
                    <div className="text-sm text-gray-600">{location.streetAddress}</div>
                    <div className="text-sm text-gray-600">{location.city}</div>
                    <div className="text-sm text-gray-600">Phone: {location.phoneNumber}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 bg-white/80 backdrop-blur-sm hover:bg-white/90 font-semibold py-3 rounded-xl text-gray-800 transition-all border-2 border-gray-300/50 shadow-lg shadow-gray-300/30 hover:scale-105"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={selectedLocationId === null}
                className="flex-1 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 hover:shadow-2xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-purple-400/50 backdrop-blur-sm shadow-lg shadow-purple-500/30"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className={`space-y-4 ${
            stepDirection === 'forward' ? 'animate-fade-in-left' : 'animate-fade-in-right'
          }`}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Review Your Order</h3>
            
            {/* Customer Info Summary */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Customer Information</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Name: {customerName}</div>
                <div>Phone: {customerPhone}</div>
                {customerEmail && <div>Email: {customerEmail}</div>}
                <div>Address: {customerStreetAddress}, {customerCity}</div>
              </div>
            </div>

            {/* Pickup Location Summary */}
            {selectedLocationId && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">Pickup Location</h4>
                <div className="text-sm text-gray-600">
                  {locations.find(l => l.id === selectedLocationId)?.name}
                  <br />
                  {locations.find(l => l.id === selectedLocationId)?.streetAddress}
                  <br />
                  {locations.find(l => l.id === selectedLocationId)?.city}
                </div>
              </div>
            )}

            {/* Products Summary */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2">Order Items</h4>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="font-semibold text-gray-800">
                      ${(item.product.specialPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t-2 border-gray-300 flex justify-between items-center">
                <span className="font-bold text-gray-800">Total</span>
                <span className="text-xl font-bold text-purple-600">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none resize-none"
                placeholder="Any special instructions or notes..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 bg-white/80 backdrop-blur-sm hover:bg-white/90 font-semibold py-3 rounded-xl text-gray-800 transition-all border-2 border-gray-300/50 shadow-lg shadow-gray-300/30 hover:scale-105"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 hover:shadow-2xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-green-400/50 backdrop-blur-sm shadow-lg shadow-green-500/30"
              >
                {isSubmitting ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

