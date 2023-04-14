import { usePlugin, renderWidget, useTracker } from '@remnote/plugin-sdk';
import axios from 'axios';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BM_IDS, shouldCountEdits } from '../shared';

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

export const SampleWidget = () => {
  const bmuser = useTracker((p) => p.settings.getSetting<string>(BM_IDS.authUser));
  const bmtoken = useTracker((p) => p.settings.getSetting<string>(BM_IDS.authToken));
  const goalReviews = useTracker((p) => p.settings.getSetting<string>(BM_IDS.goalReviews));
  const goalEdits = useTracker((p) => p.settings.getSetting<string>(BM_IDS.goalEdits));
  const reviewCount = useTracker((p) => p.storage.getSynced<number>(BM_IDS.reviewCount)) || 0;
  const editCount = useTracker((p) => p.storage.getSynced<number>(BM_IDS.editCount)) || 0;
  const counting: boolean =
    useTracker(async (p) => {
      const rem = await p.focus.getFocusedPortal();
      if (!rem) return false;
      return shouldCountEdits(rem);
    }) || false;

  const user = useQuery<User>(
    ['user'],
    async () => {
      const url = `https://www.beeminder.com/api/v1/users/${bmuser}.json?auth_token=${bmtoken}`;
      const { data } = await axios.get(url);

      return data;
    },
    {
      enabled: !!bmuser && !!bmtoken,
    }
  );

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
    </Shell>
  );
};

renderWidget(() => (
  <QueryClientProvider client={queryClient}>
    <SampleWidget />
  </QueryClientProvider>
));
