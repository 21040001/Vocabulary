import React from 'react';
import { Pressable, Text } from 'react-native';
import { makeStyles } from '../../../theme/makeStyles';
import { spacing } from '../../../theme/spacing';

export default function TranslateButton({ title, onPress }: { title: string; onPress: () => void }) {
  const s = useStyles();
  return (
    <Pressable style={s.button} onPress={onPress}>
      <Text style={s.text}>{title}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(c => ({
  button: { marginTop: spacing.md, padding: spacing.md, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
  text: { color: c.white, fontSize: 16, fontWeight: '600' },
}));
