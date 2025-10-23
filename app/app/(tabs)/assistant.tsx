import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { useDeadlines } from '@/hooks/useDeadlines';
import InsightCard from '@/components/InsightCard';
import InsightsGrid from '@/components/InsightsGrid';
import AssistantActionRow from '@/components/AssistantActionRow';
import dayjs from 'dayjs';

export default function AssistantScreen() {
  const { user } = useAuth();
  const { events } = useEvents(user?.uid || null);
  const { deadlines } = useDeadlines(user?.uid || null);

  // Calculate insights from mock data
  const insights = useMemo(() => {
    const now = dayjs();
    const threeDaysFromNow = now.add(3, 'day');

    // Unconfirmed invites (pending events)
    const unconfirmedCount = events.filter((e) => e.status === 'pending').length;

    // Upcoming lessons in next 3 days
    const upcomingLessons = events.filter((e) =>
      dayjs(e.startTime).isAfter(now) && dayjs(e.startTime).isBefore(threeDaysFromNow)
    ).length;

    // Deadlines due soon (next 7 days, not completed)
    const deadlinesDueSoon = deadlines.filter((d) => {
      const dueDate = dayjs(d.dueDate);
      return !d.completed && dueDate.isAfter(now) && dueDate.diff(now, 'day') <= 7;
    }).length;

    // Overdue tasks
    const overdueTasks = deadlines.filter((d) => {
      const dueDate = dayjs(d.dueDate);
      return !d.completed && dueDate.isBefore(now, 'day');
    }).length;

    // Completion rate
    const totalDeadlines = deadlines.length;
    const completedDeadlines = deadlines.filter((d) => d.completed).length;
    const completionRate = totalDeadlines > 0 
      ? Math.round((completedDeadlines / totalDeadlines) * 100) 
      : 0;

    return {
      unconfirmedCount,
      upcomingLessons,
      deadlinesDueSoon,
      overdueTasks,
      completionRate,
    };
  }, [events, deadlines]);

  // AI Assistant actions
  const assistantActions = [
    {
      icon: '📧',
      title: 'Resend Reminders',
      description: 'Send reminders for pending invites',
      onPress: () => Alert.alert('Resend Reminders', `Sending reminders for ${insights.unconfirmedCount} pending invites...`),
    },
    {
      icon: '📊',
      title: 'Summarize Week',
      description: 'Get a summary of this week\'s activities',
    },
    {
      icon: '🔔',
      title: 'Set Smart Reminders',
      description: 'AI will suggest optimal reminder times',
    },
    {
      icon: '📅',
      title: 'Find Available Times',
      description: 'Scan calendar for open slots',
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back, {user?.displayName || 'there'}! ✨</Text>
        <Text style={styles.subheading}>Here's what's happening</Text>
      </View>

      {/* Insights Grid */}
      <InsightsGrid columns={2}>
        <InsightCard
          icon="📩"
          title="Unconfirmed Invites"
          value={insights.unconfirmedCount}
          subtitle="Need your response"
          color="#FF9800"
        />
        <InsightCard
          icon="📚"
          title="Upcoming (3 days)"
          value={insights.upcomingLessons}
          subtitle="Sessions scheduled"
          color="#007AFF"
        />
        <InsightCard
          icon="⏰"
          title="Deadlines Due Soon"
          value={insights.deadlinesDueSoon}
          subtitle="Within 7 days"
          color="#9C27B0"
        />
        <InsightCard
          icon="⚠️"
          title="Overdue Tasks"
          value={insights.overdueTasks}
          subtitle="Need attention"
          color="#FF3B30"
        />
        <InsightCard
          icon="✅"
          title="Completion Rate"
          value={`${insights.completionRate}%`}
          subtitle="Tasks completed"
          color="#4CAF50"
        />
      </InsightsGrid>

      {/* Section divider */}
      <View style={styles.divider}>
        <Text style={styles.dividerText}>Quick Actions</Text>
      </View>

      {/* AI Actions */}
      <AssistantActionRow actions={assistantActions} />

      {/* Footer spacing */}
      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: '#666',
  },
  divider: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    height: 40,
  },
});

