export function flyToCartAnimation(
  cardElement: HTMLElement,
  // imageUrl removed
  onComplete?: () => void
) {
  const targetCart = document.getElementById('cart-icon');
  
  if (!targetCart) {
    if (onComplete) onComplete();
    return;
  }

  const startRect = cardElement.getBoundingClientRect();
  const targetRect = targetCart.getBoundingClientRect();

  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;

  const targetX = targetRect.left + targetRect.width / 2;
  const targetY = targetRect.top + targetRect.height / 2;

  // Outer wrapper handles X axis (ease-out for curve)
  const wrapperX = document.createElement('div');
  wrapperX.style.position = 'fixed';
  wrapperX.style.top = '0';
  wrapperX.style.left = '0';
  wrapperX.style.pointerEvents = 'none';
  wrapperX.style.zIndex = '9999';
  wrapperX.style.transform = `translateX(${startX}px)`;

  // Inner wrapper handles Y axis (ease-in for curve)
  const wrapperY = document.createElement('div');
  wrapperY.style.transform = `translateY(${startY}px)`;

  // Clone the card element for the visual token
  const flyingToken = cardElement.cloneNode(true) as HTMLElement;
  // Clear id to avoid duplicates
  flyingToken.removeAttribute('id');
  
  flyingToken.style.position = 'absolute';
  flyingToken.style.left = '0';
  flyingToken.style.top = '0';
  flyingToken.style.margin = '0';
  flyingToken.style.width = `${startRect.width}px`;
  flyingToken.style.height = `${startRect.height}px`;
  
  // Translate -50% to center it on the X/Y coordinate
  flyingToken.style.transform = 'translate(-50%, -50%) scale(1) rotate(0deg)';
  flyingToken.style.boxShadow = '0 12px 30px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,122,0,0.5)';
  
  wrapperY.appendChild(flyingToken);
  wrapperX.appendChild(wrapperY);
  document.body.appendChild(wrapperX);

  // Force layout to ensure transitions trigger
  void wrapperX.offsetHeight;

  requestAnimationFrame(() => {
    // Phase 1: pop out (scale up slightly)
    flyingToken.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.3)';
    flyingToken.style.transform = 'translate(-50%, -50%) scale(1.05) rotate(3deg)';
    
    // Phase 2: fly to cart
    setTimeout(() => {
      // Setup transitions for transform only
      // X axis: ease-in (starts slightly slow, accelerates horizontally)
      wrapperX.style.transition = 'transform 0.9s cubic-bezier(0.3, 0, 0.8, 0.15)'; 
      wrapperX.style.transform = `translateX(${targetX}px)`;
      
      // Y axis: ease-out (starts fast upwards, slows down as it reaches cart)
      wrapperY.style.transition = 'transform 0.9s cubic-bezier(0.1, 0.7, 0.2, 1)'; 
      wrapperY.style.transform = `translateY(${targetY}px)`;

      // Rotate, scale down and fade out
      flyingToken.style.transition = 'transform 0.9s ease-in-out, opacity 0.9s cubic-bezier(0.8, 0, 1, 1), box-shadow 0.9s ease-out';
      flyingToken.style.transform = 'translate(-50%, -50%) scale(0.08) rotate(10deg)';
      flyingToken.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)';
      flyingToken.style.opacity = '0.1'; // fades out right at the end
    }, 100);
  });

  // Calculate bounce for cart
  setTimeout(() => {
    targetCart.style.transition = 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    targetCart.style.transform = 'scale(1.25)';
    setTimeout(() => {
      targetCart.style.transform = 'scale(1)';
    }, 150);
  }, 950);

  // Cleanup after animation
  setTimeout(() => {
    if (document.body.contains(wrapperX)) {
      document.body.removeChild(wrapperX);
    }
    if (onComplete) onComplete();
  }, 1050);
}
