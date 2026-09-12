import { AppBar, Toolbar, Typography, Container } from '@mui/material';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">
                        Choir Control
                    </Typography>
                </Toolbar>
            </AppBar>

            <Container sx={{ mt: 4 }}>
                {children}
            </Container>
        </>
    );
}
