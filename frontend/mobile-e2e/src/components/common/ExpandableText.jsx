import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ExpandableText = ({ 
  text, 
  maxLength = 100, 
  className = '', 
  expandButtonClassName = 'text-blue-600 hover:text-blue-800 text-xs'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text || text.length <= maxLength) {
    return <span className={className}>{text}</span>;
  }
  
  return (
    <div>
      <span className={className}>
        {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      </span>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`ml-2 inline-flex items-center ${expandButtonClassName}`}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-3 h-3 mr-1" />
            Show Less
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3 mr-1" />
            Show More
          </>
        )}
      </button>
    </div>
  );
};

export default ExpandableText;