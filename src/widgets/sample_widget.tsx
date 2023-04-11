import { usePlugin, renderWidget, useTracker } from '@remnote/plugin-sdk';
import axios from 'axios';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

type User = {
  username: string;
};

export const SampleWidget = () => {
  const plugin = usePlugin();
  const bmuser = useTracker(() => plugin.settings.getSetting<string>('bmuser'));
  const bmtoken = useTracker(() => plugin.settings.getSetting<string>('bmtoken'));

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

  return (
    <div className="p-2 m-2 rounded-lg rn-clr-background-light-positive rn-clr-content-positive">
      <h1 className="text-xl">Sample Plugin</h1>

      <div>
        {user.isSuccess && (
          <>
            Authenticated as Beeminder user{' '}
            <a href={`https://beeminder.com/${user.data?.username}`} target="_blank">
              {user.data?.username}
            </a>
          </>
        )}
      </div>
    </div>
  );
};

renderWidget(() => (
  <QueryClientProvider client={queryClient}>
    <SampleWidget />
  </QueryClientProvider>
));
