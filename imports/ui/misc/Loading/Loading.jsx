import React from 'react';

const Loading = () => (
  <div className="Loading">
    <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" stroke="#4285F4">
      <g fill="none" fillRule="evenodd" strokeWidth="2">
        <circle cx="11" cy="11" r="1">
          <animate
            attributeName="r"
            begin="0s"
            dur="1.8s"
            values="1; 10"
            calcMode="spline"
            keyTimes="0; 1"
            keySplines="0.165, 0.84, 0.22, 1"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            begin="0s"
            dur="1.8s"
            values="1; 0"
            calcMode="spline"
            keyTimes="0; 1"
            keySplines="0.3, 0.61, 0.355, 1"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="11" cy="11" r="1">
          <animate
            attributeName="r"
            begin="-0.9s"
            dur="1.8s"
            values="1; 10"
            calcMode="spline"
            keyTimes="0; 1"
            keySplines="0.165, 0.84, 0.22, 1"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            begin="-0.9s"
            dur="1.8s"
            values="1; 0"
            calcMode="spline"
            keyTimes="0; 1"
            keySplines="0.3, 0.61, 0.355, 1"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    </svg>
  </div>
);

export default Loading;
