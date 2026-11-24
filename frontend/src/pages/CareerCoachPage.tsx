import React from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { VillainAgent } from '../components/career/VillainAgent';

export const CareerCoachPage: React.FC = () => {
  return (
    <PageWrapper className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-4 space-y-4">
      {/* Primary Studio Interface */}
      <VillainAgent />
    </PageWrapper>
  );
};

export default CareerCoachPage;

