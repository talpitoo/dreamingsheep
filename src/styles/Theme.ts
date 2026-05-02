import { createTheme } from "@mui/material"
import { cyan } from "@mui/material/colors"

// declare module "@mui/material/styles" {
//   interface BreakpointOverrides {
//     xxs: true // adds the `xxs` breakpoint
//     xs: true
//     sm: true
//     md: true
//     lg: true
//     xl: true
//   }
// }

const Theme = createTheme({
  // breakpoints: {
  //   values: {
  //     xxs: 0,
  //     xs: 320,
  //     sm: 600,
  //     md: 900,
  //     lg: 1200,
  //     xl: 1536,
  //   },
  // },
  palette: {
    mode: "light",
    primary: {
      main: "#e84122",
    },
    secondary: {
      main: "#e6e5e5",
    },
  },
  // https://mui.com/material-ui/customization/theme-components/
  components: {
    // MuiButtonBase: {
    //   defaultProps: {
    //     // The props to change the default for.
    //     disableRipple: true, // No more ripple, on the whole application 💣!
    //   },
    // },
    MuiButton: {
      styleOverrides: {
        // Name of the slot
        root: {
          "&.MuiButton-containedPrimary": {
            // backgroundColor: "#e84122",
            backgroundImage: 'url("/assets/button.jpg")',
            backgroundRepeat: "no-repeat",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& legend span": {
            display: "none",
          },
          "&.MuiInputBase-formControl": {
            backgroundColor: "#fff",
          },
          // "& .MuiOutlinedInput-notchedOutline": {
          //   top: 0,
          // },
          "&.Mui-focused": {
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: cyan[500],
              // borderWidth: "1px",
            },
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          "&": {
            display: "none",
          },
          "&.Mui-focused": {
            "&.MuiInputLabel-root": {
              color: cyan[500],
            },
          },
        },
      },
    },
  },
})

export default Theme
