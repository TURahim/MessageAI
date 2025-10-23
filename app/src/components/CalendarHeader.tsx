import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);

interface CalendarHeaderProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function CalendarHeader({ selectedDate, onDateSelect }: CalendarHeaderProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    dayjs(selectedDate).startOf('isoWeek')
  );

  // Generate 7 days for the current week
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    currentWeekStart.add(i, 'day')
  );

  const handlePrevWeek = () => {
    setCurrentWeekStart(currentWeekStart.subtract(1, 'week'));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(currentWeekStart.add(1, 'week'));
  };

  const handleDayPress = (date: dayjs.Dayjs) => {
    onDateSelect(date.toDate());
  };

  const isSelected = (date: dayjs.Dayjs) => {
    return date.isSame(dayjs(selectedDate), 'day');
  };

  const isToday = (date: dayjs.Dayjs) => {
    return date.isSame(dayjs(), 'day');
  };

  return (
    <View style={styles.container}>
      {/* Month/Year header with navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevWeek} style={styles.navButton}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.monthYear}>
          {currentWeekStart.format('MMMM YYYY')}
        </Text>

        <TouchableOpacity onPress={handleNextWeek} style={styles.navButton}>
          <Text style={styles.navButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Week days */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekDays}
      >
        {weekDays.map((day, index) => {
          const selected = isSelected(day);
          const today = isToday(day);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayButton,
                selected && styles.dayButtonSelected,
                today && !selected && styles.dayButtonToday,
              ]}
              onPress={() => handleDayPress(day)}
            >
              <Text
                style={[
                  styles.dayName,
                  selected && styles.dayNameSelected,
                  today && !selected && styles.dayNameToday,
                ]}
              >
                {day.format('ddd')}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  selected && styles.dayNumberSelected,
                  today && !selected && styles.dayNumberToday,
                ]}
              >
                {day.format('D')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 20,
    color: '#007AFF',
  },
  weekDays: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  dayButton: {
    width: 50,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
  },
  dayButtonToday: {
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  dayName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  dayNameSelected: {
    color: '#fff',
  },
  dayNameToday: {
    color: '#007AFF',
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  dayNumberSelected: {
    color: '#fff',
  },
  dayNumberToday: {
    color: '#007AFF',
  },
});

