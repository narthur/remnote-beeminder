import { renderWidget, useTracker, RemViewer, Rem } from '@remnote/plugin-sdk';
import axios from 'axios';
import { useQuery, QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { BM_IDS, getLogRem, shouldCountEdits } from '../shared';
import { useEffect, useRef, useState } from 'react';

const queryClient = new QueryClient();

type User = {
  username: string;
};

const Shell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="p-2 m-2 rounded-lg rn-clr-background-light-positive rn-clr-content-positive">
      <h1 className="text-xl">Beeminder Integration</h1>
      <div>{children}</div>
    </div>
  );
};

const Cell = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <td className={`p-1 border-b text-left ${className}`}>{children}</td>;
};

const CellHead = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <th className={`font-bold p-1 border-b text-left ${className}`}>{children}</th>;
};

const Logs = (): JSX.Element => {
  const logs = useLogs();

  if (logs === undefined) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <p>Last 10 logs of {logs.length} total:</p>
      <ul>
        {logs.slice(-10).map((r) => (
          <li key={r._id}>
            <RemViewer remId={r._id} width="100%" />
          </li>
        ))}
      </ul>
    </>
  );
};

function useLogs() {
  const parent = useTracker(getLogRem);
  const rems = useTracker(async () => parent?.getDescendants(), [parent]);
  const [logs, setItems] = useState<Rem[]>();
  const timeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      if (rems) setItems(rems);
    }, 1000);
    return () => clearTimeout(timeout.current);
  }, [rems]);

  return logs;
}

function useIsCounting() {
  return (
    useTracker(async (p) => {
      const rem = await p.focus.getFocusedPortal();
      return rem && shouldCountEdits(rem);
    }) || false
  );
}

async function getBeeminderUser(user: string | undefined, token: string | undefined) {
  if (!user || !token) {
    throw new Error('No user or token');
  }

  return (
    await axios.get<User>(`https://www.beeminder.com/api/v1/users/${user}.json?auth_token=${token}`)
  ).data;
}

function useBeeminderUser(user: string | undefined, token: string | undefined) {
  return useQuery<User>(['user'], () => getBeeminderUser(user, token), {
    enabled: !!user && !!token,
  });
}

const buttonStyles = {
  backgroundColor: '#fff',
  color: '#000',
  borderRadius: '4px',
  padding: '4px 8px',
  cursor: 'pointer',
  marginRight: '8px',
};

const buttonStylesLoading = {
  ...buttonStyles,
  backgroundColor: '#ccc',
};

function LogDetails() {
  const enableLogging = useTracker((p) => p.settings.getSetting<boolean>(BM_IDS.enableLogging));
  const logRem = useTracker(getLogRem);
  const openLogs = useMutation(['rem.open'], () => Promise.resolve(logRem?.openRemAsPage()));
  const deleteLogs = useMutation(['rem.delete'], () => Promise.resolve(logRem?.remove()));
  const [showLogs, setShowLogs] = useState(false);

  return (
    <>
      <p>
        <strong>Logging {enableLogging ? 'enabled' : 'disabled'}.</strong> You can{' '}
        {enableLogging ? 'disable' : 'enable'} logging in the plugin's settings.
      </p>

      {logRem && (
        <>
          <button style={buttonStyles} onClick={() => setShowLogs((v) => !v)}>
            {showLogs ? 'Hide logs' : 'Show logs'}
          </button>

          <button
            style={openLogs.isLoading ? buttonStylesLoading : buttonStyles}
            disabled={openLogs.isLoading}
            onClick={() => openLogs.mutate()}
          >
            {openLogs.isLoading ? 'Opening...' : 'See all logs'}
          </button>

          <button
            style={deleteLogs.isLoading ? buttonStylesLoading : buttonStyles}
            disabled={deleteLogs.isLoading}
            onClick={() => deleteLogs.mutate()}
          >
            {deleteLogs.isLoading ? 'Deleting...' : 'Delete all logs'}
          </button>

          {showLogs && <Logs />}
        </>
      )}
    </>
  );
}

export const SampleWidget = () => {
  const bmuser = useTracker((p) => p.settings.getSetting<string>(BM_IDS.authUser));
  const bmtoken = useTracker((p) => p.settings.getSetting<string>(BM_IDS.authToken));
  const goalReviews = useTracker((p) => p.settings.getSetting<string>(BM_IDS.goalReviews));
  const goalEdits = useTracker((p) => p.settings.getSetting<string>(BM_IDS.goalEdits));
  const reviewCount = useTracker((p) => p.storage.getSynced<number>(BM_IDS.reviewCount)) || 0;
  const editCount = useTracker((p) => p.storage.getSynced<number>(BM_IDS.editCount)) || 0;

  const counting = useIsCounting();
  const user = useBeeminderUser(bmuser, bmtoken);

  if (!bmuser || !bmtoken) {
    return (
      <Shell>
        <p>Please fill in your Beeminder authentication details in the plugin's settings.</p>
        <p>
          Your Beeminder API token is available{' '}
          <a href="https://www.beeminder.com/api/v1/auth_token.json" target="_blank">
            here
          </a>
          .
        </p>
      </Shell>
    );
  }

  if (user.isLoading) {
    return (
      <Shell>
        <p>Loading...</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <table>
        <thead>
          <tr>
            <CellHead>Event</CellHead>
            <CellHead>Goal</CellHead>
            <CellHead>Today</CellHead>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Cell>Reviews</Cell>
            <Cell>
              {goalReviews ? (
                <a target="_blank" href={`https://beeminder.com/${bmuser}/${goalReviews}`}>
                  {bmuser}/{goalReviews}
                </a>
              ) : (
                '—'
              )}
            </Cell>
            <Cell>{reviewCount}</Cell>
          </tr>
          <tr className="border-b">
            <Cell>Edits</Cell>
            <Cell>
              {goalEdits ? (
                <a target="_blank" href={`https://beeminder.com/${bmuser}/${goalEdits}`}>
                  {bmuser}/{goalEdits}
                </a>
              ) : (
                '—'
              )}
            </Cell>
            <Cell>{editCount}</Cell>
          </tr>
        </tbody>
      </table>

      {user.isSuccess && (
        <p>
          Authenticated as Beeminder user{' '}
          <a href={`https://beeminder.com/${user.data?.username}`} target="_blank">
            {user.data?.username}
          </a>
        </p>
      )}

      <p>
        {counting ? <strong>Counting edits.</strong> : <strong>Not counting edits.</strong>} Edits
        are only counted when you are editing a rem which is or has an ancestor tagged with
        BmCountEdits.
      </p>

      <LogDetails />
    </Shell>
  );
};

renderWidget(() => (
  <QueryClientProvider client={queryClient}>
    <SampleWidget />
  </QueryClientProvider>
));
