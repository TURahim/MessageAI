import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';

interface InsightsGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
}

export default function InsightsGrid({ children, columns = 2, gap = 16 }: InsightsGridProps) {
  const { width } = useWindowDimensions();
  
  // On smaller screens (< 600px), use 1 column
  // On larger screens, use specified columns
  const numColumns = width < 600 ? 1 : columns;

  return (
    <View style={[styles.grid, { gap }]}>
      {React.Children.map(children, (child, index) => (
        <View
          key={index}
          style={[
            styles.gridItem,
            {
              width: numColumns === 1 ? '100%' : `${100 / numColumns - (gap * (numColumns - 1)) / numColumns}%`,
            },
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  gridItem: {
    marginBottom: 16,
  },
});

