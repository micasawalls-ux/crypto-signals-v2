import React from 'react';

interface RichTextProps {
  text: string;
}

export const RichText: React.FC<RichTextProps> = ({ text }) => {
  return <span className="text-gray-300">{text}</span>;
};
