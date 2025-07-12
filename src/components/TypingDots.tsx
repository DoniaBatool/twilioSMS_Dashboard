import React from "react";

export default function TypingDots() {
  return (
    <div className="flex items-center space-x-1 h-6">
      <span className="dot bg-blue-400 animate-bounce" style={{ animationDelay: '0s' }}></span>
      <span className="dot bg-blue-400 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
      <span className="dot bg-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
      <style jsx>{`
        .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
} 