import React, { useState, useEffect } from 'react';

const images = [
  'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
  'https://images.unsplash.com/photo-1533591380348-14193f1de18f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2090&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3a8034?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
];

export function DynamicBackground() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 10000); // Change image every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full -z-10">
      {images.map((image, index) => (
        <div
          key={image}
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000"
          style={{ 
            backgroundImage: `url(${image})`,
            opacity: index === currentImageIndex ? 1 : 0
          }}
        />
      ))}
      <div className="absolute inset-0 w-full h-full bg-black/20" />
    </div>
  );
}
