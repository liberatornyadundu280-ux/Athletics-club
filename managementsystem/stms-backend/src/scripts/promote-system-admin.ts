import { closeDatabaseConnection, connectToDatabase } from '../config/database';
import { firebaseAuth, setUserClaims } from '../config/firebase';
import { UserDocument } from '../types';

async function promoteSystemAdmin(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: npm run admin:promote -- admin@example.com');
  }

  await connectToDatabase();
  const db = (await import('../config/database')).getDatabase();
  const firebaseUser = await firebaseAuth.getUserByEmail(email);
  const user = await db.collection<UserDocument>('users').findOne({ firebaseUid: firebaseUser.uid });
  if (!user) throw new Error('This Firebase account has no STMS MongoDB profile. Sign in to STMS once, then retry.');
  if (user.status !== 'active') throw new Error('Only an active STMS account can be promoted.');

  const clubIds = user.clubIds.map(id => id.toString());
  await setUserClaims(firebaseUser.uid, {
    role: 'system_admin',
    clubIds,
    activeClubId: user.activeClubId?.toString() || null,
    permissions: ['*'],
  });
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { role: 'system_admin', permissions: ['*'], updatedAt: new Date() } }
  );

  console.log(`Promoted ${email} to system_admin. Sign out and back in to refresh the STMS session.`);
}

promoteSystemAdmin()
  .catch(error => {
    console.error(`System admin promotion failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabaseConnection();
  });
